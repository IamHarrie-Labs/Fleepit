/**
 * Fleepit Analyst — Research Agent
 * ------------------------------------------------------------------------
 * All-encompassing Mantle ecosystem research. Covers: tokens, protocols,
 * DeFi yields, RWA, chain health, price analysis, investment timing,
 * comparisons, wallets, gas, and more. Not just pools.
 *
 * Uses Groq function-calling (Llama-3.1-8b-instant) in a multi-step tool
 * loop, streamed token-by-token. Emits step + delta events via onStep for
 * the live "agent working" UI feed. Guardrails: round cap, per-call
 * timeout, caught tool errors, always resolves. No hardcoded answer text
 * anywhere — every reply, including greetings, comes from the model itself.
 *
 * Model: llama-3.1-8b-instant rather than the 70b version — Groq gives each
 * hosted model its own separate daily token quota, and the 8b model's is
 * much larger, so real users hit the free-tier daily cap far less often.
 * Slightly less sharp reasoning than the 70b model, traded for reliability.
 */

import { toolSchemas, toolExecutors } from "./agentTools";

const GROQ_URL      = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const MAX_ROUNDS    = 4;      // most queries resolve in 1-2 rounds; cap keeps token use bounded
const LLM_TIMEOUT   = 30_000;

// ── Tool-schema trimming ─────────────────────────────────────────────────────
// The full tool schema JSON (~12 tools with param descriptions) is resent on
// every single round of the loop, so it dominates token use on multi-round
// queries. A cheap keyword pre-router narrows the set to what the question
// plausibly needs instead of always sending everything. Errs toward
// over-inclusion for ambiguous cases -- this trims the clearly-irrelevant
// tail (wallet lookups, price history, pool drilldown), it doesn't try to
// be surgically minimal.
const CORE_TOOLS = ["get_mantle_tokens", "get_mantle_protocols", "list_mantle_pools", "get_mantle_chain_metrics"];
const KEYWORD_TOOLS = [
  { re: /0x[a-fA-F0-9]{40}|\bwallet\b|\baddress\b|\bholdings?\b|\btransactions?\b/i, tools: ["get_wallet_overview", "get_wallet_tokens", "get_address_transactions"] },
  { re: /\bgas\b|\bblock(number)?\b|how busy|congestion|network (status|state|activity|load)/i, tools: ["get_gas_network"] },
  { re: /trend|history|chart|good time to (buy|sell)|momentum over|last (week|month)/i, tools: ["get_token_price_history"] },
  { re: /sustainable|apy (trend|history|stable)|is this yield|pool history|been (stable|volatile)/i, tools: ["get_pool_details", "get_pool_history"] },
  { re: /\bcompare\b|\bvs\.?\b|\bversus\b|better than|which (one|is better)/i, tools: ["compare_assets"] },
  { re: /\bnews\b|headline|announce|partnership|listing|launch(ed|es)?\b|what('s| is) (new|happening)|latest|recent(ly)? (update|development|event)/i, tools: ["get_mantle_news"] },
];

export function selectToolSchemas(question) {
  const q = question || "";
  const names = new Set(CORE_TOOLS);
  for (const { re, tools } of KEYWORD_TOOLS) {
    if (re.test(q)) tools.forEach((t) => names.add(t));
  }
  return toolSchemas.filter((s) => names.has(s.function.name));
}
const TOOL_RESULT_CAP = 2500; // chars of a tool result fed back to the model
const HISTORY_TURNS   = 3;    // prior user/assistant exchanges kept for follow-up context

// ── Deterministic "how many did you actually ask for" enforcement ──────────
// The model picks its own `limit` argument when calling a list tool, and it
// doesn't reliably match a count the user actually stated ("give me 5 good
// tokens" can still come back as a limit of 3). Rather than trust the model
// to get this right every time, the user's stated count is extracted here
// with a plain regex and forced onto the tool call — the same "put the rule
// in code, not just the prompt" approach already used for stablecoin
// filtering. Only applied to tools whose whole job is "list N things", so it
// can't misfire on unrelated numbers like a dollar amount or a duration.
const LIST_TOOLS_WITH_LIMIT = new Set(["get_mantle_tokens", "get_mantle_protocols", "list_mantle_pools", "get_mantle_news"]);
const WORD_TO_NUM = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};
const NUMBER_RE = `(?:\\d{1,2}|${Object.keys(WORD_TO_NUM).join("|")})`;
const COUNT_KEYWORDS = "tokens?|pools?|protocols?|coins?|assets?|picks?|options?|recommendations?|headlines?|posts?|opportunities?";
// number, optionally with 1-2 filler words ("5 good tokens"), then a keyword noun
const COUNT_RE = new RegExp(`\\b(${NUMBER_RE})\\s+(?:\\w+\\s+){0,2}(?:${COUNT_KEYWORDS})\\b`, "i");

export function extractRequestedCount(question) {
  const m = (question || "").match(COUNT_RE);
  if (!m) return null;
  const token = m[1].toLowerCase();
  return /^\d+$/.test(token) ? Number(token) : WORD_TO_NUM[token] ?? null;
}

// ── System prompts ──────────────────────────────────────────────────────────

const ANALYST_SYSTEM = `You are the Fleepit Analyst, a buy-side research agent for the whole Mantle ecosystem (chain 5000): tokens, protocols, yield pools, RWAs, chain metrics, gas, and wallet addresses.

Rules:
- Never state a live price, APY, TVL, balance, or gas figure from memory. Call a tool first. Never invent a number.
- For "good tokens to invest in" style questions, exclude stablecoins (USDT, USDC, USD1, USDe, USDY, sUSDe, etc.) unless the user explicitly asks about them. Rank by market cap, 24h/7d momentum, and volume-to-cap liquidity, not market cap alone.
- For investment projections ("if I invest $1000"), show principal, expected return, and the key caveat.
- Be decisive: end with a clear answer, who it suits, and the main risk.
- If the user's message refers back to the prior exchange ("that one", "the second option", "what about MNT instead"), use the conversation history above to resolve what they mean before deciding whether a tool call is needed.
- Answer the question that was actually asked. Never substitute unrelated data because the right data is unavailable: if the user asks for news and you cannot get news, say so plainly rather than showing token prices instead.

Tool routing:
- prices / top or best tokens -> get_mantle_tokens; price trend or "good time to buy" -> get_token_price_history
- top protocols / where is liquidity -> get_mantle_protocols
- yield / staking / APY / pools -> list_mantle_pools
- compare named assets -> compare_assets
- gas / how busy / current block -> get_gas_network
- a 0x address (what is it / what it holds / its activity) -> get_wallet_overview, plus get_wallet_tokens and get_address_transactions
- news / what's happening / latest announcements or launches -> get_mantle_news
- any investment question -> also get_mantle_chain_metrics for macro context

General questions: for definitional or conceptual ones that need no live number (what is Mantle, what is mETH, what is an RWA), answer directly from your knowledge, framed as general context. Do not force a tool call.

Greetings or small talk (hi, how are you, thanks): reply in one short, natural, varied sentence and invite a Mantle research question. Never call a tool for these.

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
  get_mantle_news: "Scanning Mantle headlines",
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
      case "get_mantle_news":      return `${result.count ?? 0} headlines`;
      default: return "done";
    }
  } catch { return "done"; }
}

// ── LLM call, streamed ───────────────────────────────────────────────────────
// Always requests a stream. Accumulates both content and tool_calls deltas
// (Groq/OpenAI-compatible chunks never mix the two within one response), and
// forwards content deltas to onDelta as they arrive so the UI can render the
// final answer progressively instead of waiting for the whole thing.
async function callGroqOnce(apiKey, model, messages, tools, temperature, onDelta) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, messages,
        ...(tools ? { tools, tool_choice: "auto" } : {}),
        temperature, max_tokens: 700, stream: true,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const err = new Error(json.error?.message || `LLM error ${res.status}`);
      err.code = json.error?.code;
      err.failedGeneration = json.error?.failed_generation;
      throw err;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    const toolCallsMap = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let chunk;
        try { chunk = JSON.parse(payload); } catch { continue; }
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          try { onDelta?.(delta.content, content); } catch {}
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap.has(idx)) {
              toolCallsMap.set(idx, { id: tc.id || `call_${idx}`, type: "function", function: { name: "", arguments: "" } });
            }
            const entry = toolCallsMap.get(idx);
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.function.name += tc.function.name;
            if (tc.function?.arguments) entry.function.arguments += tc.function.arguments;
          }
        }
      }
    }

    const tool_calls = [...toolCallsMap.values()];
    return { role: "assistant", content: content || null, tool_calls: tool_calls.length ? tool_calls : undefined };
  } finally { clearTimeout(timer); }
}

// Llama on Groq occasionally emits a malformed pseudo-tag tool call instead
// of a proper structured one, e.g.:
//   <function=get_mantle_tokens {"limit": 3}</function>
// Groq rejects this as error code "tool_use_failed" but conveniently echoes
// back exactly what the model tried to call in `failed_generation`. Recover
// it directly rather than discarding a perfectly good intended call.
export function recoverToolCall(failedGeneration) {
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

// Groq's rate-limit message always ends "...try again in <duration>", e.g.
// "4.19s" or "8m19.392s". Parsed so short per-minute bursts can be waited
// out automatically instead of surfacing an error for a few seconds' delay.
const RETRY_AFTER_CAP = 20; // seconds — only auto-wait for short bursts, not the daily cap
export function parseRetryAfterSeconds(message) {
  const m = (message || "").match(/try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i);
  if (!m) return null;
  const [, h, min, s] = m;
  return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + Number(s);
}

// Retries a failed tool-calling request. First tries to recover the
// intended call from Groq's failed_generation payload (works immediately,
// no wasted request); falls back to retrying with a nudged temperature so
// a deterministic-ish failure doesn't just repeat itself identically. A
// short per-minute rate limit (a few seconds) is waited out and retried
// transparently; the much longer daily cap is left for sanitizeError to
// surface, since waiting minutes inline isn't a real fix.
async function callGroq(apiKey, model, messages, tools, onDelta, retries = 2) {
  let temperature = 0.3;
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGroqOnce(apiKey, model, messages, tools, temperature, onDelta);
    } catch (e) {
      if (e.code === "rate_limit_exceeded") {
        const waitSeconds = parseRetryAfterSeconds(e.message);
        if (waitSeconds != null && waitSeconds <= RETRY_AFTER_CAP && attempt < retries) {
          await new Promise((r) => setTimeout(r, (waitSeconds + 0.5) * 1000));
          continue;
        }
        throw e;
      }

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

// Greetings/small talk are routed WITHOUT the tool schema attached, so the
// model physically cannot call a tool (cheaper and immune to the "hi"
// triggering a random tool-call bug) — but the reply text itself still
// comes straight from the model, streamed like any other answer. Nothing
// here is a canned string.
const GREETING_RE = /^(hi|hiya|hello|hey|yo|gm|gn|sup|good\s(morning|afternoon|evening|day)|how far|thanks?|thank you|ok(ay)?|cool|nice)[\s!.,?]*$/i;

export function formatWaitDuration(totalSeconds) {
  const s = Math.ceil(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

export function sanitizeError(e) {
  const msg = e?.message || "";
  if (/rate limit/i.test(msg)) {
    // The regex above stopped at the first "." (inside the fractional
    // seconds, e.g. "4.19s"), showing "in about 4." — parse the full
    // duration properly instead.
    const waitSeconds = parseRetryAfterSeconds(msg);
    const wait = waitSeconds != null ? formatWaitDuration(waitSeconds) : null;
    return `The analyst is temporarily rate limited on its AI provider. Please try again${wait ? ` in about ${wait}` : " in a few minutes"}.`;
  }
  if (/failed to call a function/i.test(msg) || e?.code === "tool_use_failed") {
    return "The analyst had trouble planning a response to that phrasing. Try asking more directly, for example: top 2 tokens on Mantle by market cap.";
  }
  return `The analyst hit an error: ${msg}. Please try again.`;
}

// ── Main export ─────────────────────────────────────────────────────────────
/**
 * @param {{
 *   question:string, apiKey:string, model?:string,
 *   history?: Array<{question:string, answer:string}>,  prior turns, most recent last
 *   onStep?:(s:object)=>void
 * }}
 * @returns {Promise<{answer:string, sources:string[], rounds:number, conversational?:boolean}>}
 */
export async function runResearchAgent({ question, apiKey, model, history = [], onStep }) {
  const emit = s => { try { onStep?.(s); } catch {} };
  const sources = new Set();

  if (!apiKey) return {
    answer: "No API key configured. Add your Groq key in Settings to activate the analyst.",
    sources: [], rounds: 0,
  };

  const priorTurns = history.slice(-HISTORY_TURNS).flatMap((h) => ([
    { role: "user", content: h.question },
    { role: "assistant", content: h.answer },
  ]));

  const isGreeting = GREETING_RE.test((question || "").trim());
  const messages = [{ role: "system", content: ANALYST_SYSTEM }, ...priorTurns, { role: "user", content: question }];
  emit({ type: "start" });

  const streamToUi = (chunk, full) => emit({ type: "stream", chunk, text: full });

  if (isGreeting) {
    try {
      const msg = await callGroq(apiKey, model || DEFAULT_MODEL, messages, undefined, streamToUi);
      const answer = msg?.content?.trim() || "";
      emit({ type: "final", text: answer, sources: [] });
      return { answer, sources: [], rounds: 0, conversational: true };
    } catch (e) {
      const text = sanitizeError(e);
      emit({ type: "error", text });
      return { answer: text, sources: [], rounds: 0, conversational: true, error: true };
    }
  }

  const scopedTools = selectToolSchemas(question);

  let rounds = 0;
  try {
    while (rounds < MAX_ROUNDS) {
      // Only stream to the UI once we're clearly in a content (not tool-call)
      // round: peek by disabling the callback until we've seen the first
      // delta arrive as content rather than a tool call fragment.
      let sawToolCallFirst = false;
      const msg = await callGroq(apiKey, model || DEFAULT_MODEL, messages, scopedTools, (chunk, full) => {
        if (sawToolCallFirst) return;
        streamToUi(chunk, full);
      });
      // If this round produced tool calls, any partial content we streamed
      // was just planning chatter — the UI discards it once tool_call/final
      // events supersede it, so no special cleanup is needed here.
      if (msg?.tool_calls?.length) sawToolCallFirst = true;

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

        if (LIST_TOOLS_WITH_LIMIT.has(name)) {
          const requestedCount = extractRequestedCount(question);
          if (requestedCount != null) args.limit = requestedCount;
        }

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
    const finalMsg = await callGroq(apiKey, model || DEFAULT_MODEL, messages, undefined, streamToUi);
    const answer = finalMsg?.content?.trim() || "Analysis incomplete. Please try a more specific question.";
    emit({ type: "final", text: answer, sources: [...sources] });
    return { answer, sources: [...sources], rounds };

  } catch (e) {
    const text = sanitizeError(e);
    emit({ type: "error", text });
    return { answer: text, sources: [...sources], rounds, error: true };
  }
}
