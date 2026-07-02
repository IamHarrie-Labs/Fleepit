/**
 * Fleepit Analyst — Research Agent
 * ------------------------------------------------------------------------
 * All-encompassing Mantle ecosystem research. Covers: tokens, protocols,
 * DeFi yields, RWA, chain health, price analysis, investment timing,
 * comparisons, and more. Not just pools.
 *
 * Uses Groq function-calling (Llama-3.3-70b) in a multi-step tool loop.
 * Emits step events via onStep for the live "agent working" UI feed.
 * Guardrails: round cap, per-call timeout, caught tool errors, always resolves.
 */

import { toolSchemas, toolExecutors } from "./agentTools";

const GROQ_URL      = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_ROUNDS    = 4;      // most queries resolve in 1-2 rounds; cap keeps token use bounded
const LLM_TIMEOUT   = 30_000;
const TOOL_RESULT_CAP = 2500; // chars of a tool result fed back to the model

// ── System prompts ──────────────────────────────────────────────────────────

const ANALYST_SYSTEM = `You are the Fleepit Analyst, a buy-side research agent for the whole Mantle ecosystem (chain 5000): tokens, protocols, yield pools, RWAs, chain metrics, gas, and wallet addresses.

Rules:
- Never state a live price, APY, TVL, balance, or gas figure from memory. Call a tool first. Never invent a number.
- For "good tokens to invest in" style questions, exclude stablecoins (USDT, USDC, USD1, USDe, USDY, sUSDe, etc.) unless the user explicitly asks about them. Rank by market cap, 24h/7d momentum, and volume-to-cap liquidity, not market cap alone.
- For investment projections ("if I invest $1000"), show principal, expected return, and the key caveat.
- Be decisive: end with a clear answer, who it suits, and the main risk.

Tool routing:
- prices / top or best tokens -> get_mantle_tokens; price trend or "good time to buy" -> get_token_price_history
- top protocols / where is liquidity -> get_mantle_protocols
- yield / staking / APY / pools -> list_mantle_pools
- compare named assets -> compare_assets
- gas / how busy / current block -> get_gas_network
- a 0x address (what is it / what it holds / its activity) -> get_wallet_overview, plus get_wallet_tokens and get_address_transactions
- any investment question -> also get_mantle_chain_metrics for macro context

General questions: for definitional or conceptual ones that need no live number (what is Mantle, what is mETH, what is an RWA), answer directly from your knowledge, framed as general context. Do not force a tool call.

Final answer style: natural analyst prose in 2 to 4 short paragraphs. No markdown, asterisks, headers, bullets, numbered lists, emoji, or decorative dashes. No inline [source] brackets (sources show separately). State facts plainly and specifically.`;

// ── Step label helpers ──────────────────────────────────────────────────────
const TOOL_LABELS = {
  get_mantle_tokens: "Looking up Mantle tokens",
  get_token_price_history: "Pulling price history",
  get_mantle_protocols: "Checking top protocols",
  get_mantle_chain_metrics: "Reading chain metrics",
  list_mantle_pools: "Scanning yield pools",
  get_pool_details: "Looking up pool",
  get_pool_history: "Reading pool history",
  compare_assets: "Comparing assets",
  get_gas_network: "Reading Mantle gas and block",
  get_wallet_overview: "Inspecting address on-chain",
  get_wallet_tokens: "Fetching token holdings",
  get_address_transactions: "Fetching transaction history",
};
const shortAddr = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
function stepLabel(name, args) {
  if (name === "get_pool_details" && args?.query) return `Looking up ${args.query}`;
  if (name === "get_token_price_history" && args?.token_id) return `Pulling ${args.token_id} price trend`;
  if (name === "compare_assets" && args?.queries) return `Comparing ${args.queries.join(" vs ")}`;
  if ((name === "get_wallet_overview" || name === "get_wallet_tokens" || name === "get_address_transactions") && args?.address)
    return `${TOOL_LABELS[name]} ${shortAddr(args.address)}`;
  return TOOL_LABELS[name] || name;
}
function stepSummary(name, result) {
  try {
    if (result?.error) return `error: ${result.error}`;
    switch (name) {
      case "get_mantle_tokens":    return `${result.returned} tokens`;
      case "get_token_price_history": return `${result.change_pct > 0 ? "+" : ""}${result.change_pct}% over ${result.days}d`;
      case "get_mantle_protocols": return `${result.returned} protocols`;
      case "get_mantle_chain_metrics": return `TVL ${result.defi_tvl_formatted} (${result.tvl_change_30d_pct}% 30d)`;
      case "list_mantle_pools":    return `${result.returned} pools`;
      case "get_pool_details":     return result.matches?.length ? result.matches[0].symbol : "no match";
      case "get_pool_history":     return `${result.apy?.stability ?? "?"} yield, TVL ${result.tvl?.direction ?? "?"}`;
      case "compare_assets":       return `${result.compared} assets compared`;
      case "get_gas_network":      return `${result.gas_price_gwei} gwei, block ${result.latest_block}`;
      case "get_wallet_overview":  return `${result.type}, ${result.mnt_balance_formatted}`;
      case "get_wallet_tokens":    return result.needs_key ? "needs API key" : `${result.count ?? 0} tokens`;
      case "get_address_transactions": return result.needs_key ? "needs API key" : `${result.count ?? 0} txns`;
      default: return "done";
    }
  } catch { return "done"; }
}

// ── LLM call with timeout ───────────────────────────────────────────────────
async function callGroqOnce(apiKey, model, messages, tools, temperature) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, messages,
        ...(tools ? { tools, tool_choice: "auto" } : {}),
        temperature, max_tokens: 700,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json.error?.message || `LLM error ${res.status}`);
      err.code = json.error?.code;
      err.failedGeneration = json.error?.failed_generation;
      throw err;
    }
    return json.choices?.[0]?.message;
  } finally { clearTimeout(timer); }
}

// Llama on Groq occasionally emits a malformed pseudo-tag tool call instead
// of a proper structured one, e.g.:
//   <function=get_mantle_tokens {"limit": 3}</function>
// Groq rejects this as error code "tool_use_failed" but conveniently echoes
// back exactly what the model tried to call in `failed_generation`. Recover
// it directly rather than discarding a perfectly good intended call.
function recoverToolCall(failedGeneration) {
  if (!failedGeneration) return null;
  const match = failedGeneration.match(/<function=([a-zA-Z0-9_]+)\s*(\{[\s\S]*?\})\s*<\/?function>?/);
  if (!match) return null;
  try {
    const name = match[1];
    const args = JSON.parse(match[2]);
    return {
      role: "assistant",
      content: null,
      tool_calls: [{ id: `recovered_${Date.now()}`, type: "function", function: { name, arguments: JSON.stringify(args) } }],
    };
  } catch {
    return null;
  }
}

// Retries a failed tool-calling request. First tries to recover the
// intended call from Groq's failed_generation payload (works immediately,
// no wasted request); falls back to retrying with a nudged temperature so
// a deterministic-ish failure doesn't just repeat itself identically.
async function callGroq(apiKey, model, messages, tools, retries = 2) {
  let temperature = 0.3;
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGroqOnce(apiKey, model, messages, tools, temperature);
    } catch (e) {
      const retryable = e.code === "tool_use_failed" || /failed to call a function/i.test(e.message || "");
      if (!retryable) throw e;

      const recovered = recoverToolCall(e.failedGeneration);
      if (recovered) return recovered;

      if (attempt >= retries) throw e;
      temperature = Math.min(temperature + 0.25, 0.9);
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

// ── Main export ─────────────────────────────────────────────────────────────
/**
 * @param {{ question:string, apiKey:string, model?:string, onStep?:(s:object)=>void }}
 * @returns {Promise<{answer:string, sources:string[], rounds:number}>}
 */
export async function runResearchAgent({ question, apiKey, model, onStep }) {
  const emit = s => { try { onStep?.(s); } catch {} };
  const sources = new Set();

  if (!apiKey) return {
    answer: "No API key configured. Add your Groq key in Settings to activate the analyst.",
    sources: [], rounds: 0,
  };

  const messages = [{ role: "system", content: ANALYST_SYSTEM }, { role: "user", content: question }];
  emit({ type: "start" });

  let rounds = 0;
  try {
    while (rounds < MAX_ROUNDS) {
      const msg = await callGroq(apiKey, model || DEFAULT_MODEL, messages, toolSchemas);

      if (!msg?.tool_calls?.length) {
        const answer = msg?.content?.trim() || "I could not produce an answer from the available data.";
        emit({ type: "final", text: answer, sources: [...sources] });
        return { answer, sources: [...sources], rounds };
      }

      messages.push(msg);

      for (const call of msg.tool_calls) {
        const name = call.function?.name;
        let args = {};
        try { args = JSON.parse(call.function?.arguments || "{}"); } catch {}
        // Groq/Llama sometimes emits the literal string "null" as the
        // arguments payload (e.g. when a tool needs no params). That's
        // valid JSON that parses to the JS value null, not {} — every
        // executor below expects an object, so normalize it here once.
        if (!args || typeof args !== "object" || Array.isArray(args)) args = {};

        emit({ type: "tool_call", name, label: stepLabel(name, args), args });

        let result;
        try {
          const exec = toolExecutors[name];
          result = exec ? await exec(args) : { error: `Unknown tool: ${name}` };
        } catch (e) {
          result = { error: e.message || "tool failed" };
        }

        if (result?.source) sources.add(result.source);
        emit({ type: "tool_result", name, summary: stepSummary(name, result), result });

        messages.push({
          role: "tool", tool_call_id: call.id, name,
          content: JSON.stringify(result).slice(0, TOOL_RESULT_CAP),
        });
      }
      rounds++;
    }

    // Force final answer if round cap hit
    messages.push({ role: "user", content: "You have enough data. Write your final answer now in plain prose paragraphs, no more tool calls." });
    const finalMsg = await callGroq(apiKey, model || DEFAULT_MODEL, messages, undefined);
    const answer = finalMsg?.content?.trim() || "Analysis incomplete. Please try a more specific question.";
    emit({ type: "final", text: answer, sources: [...sources] });
    return { answer, sources: [...sources], rounds };

  } catch (e) {
    const text = e.code === "tool_use_failed" || /failed to call a function/i.test(e.message || "")
      ? "The analyst had trouble planning a response to that phrasing. Try asking more directly, for example: top 2 tokens on Mantle by market cap."
      : `The analyst hit an error: ${e.message}. Please try again.`;
    emit({ type: "error", text });
    return { answer: text, sources: [...sources], rounds };
  }
}
