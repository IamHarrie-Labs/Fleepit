/**
 * Vercel Cron Job — runs on a schedule even when no one is on the site.
 * Fetches live Mantle pool data, picks the top opportunities,
 * and sends a Telegram digest to ALL subscribers stored in Upstash Redis.
 *
 * Also sends to TELEGRAM_CHAT_ID if set (owner fallback / channel broadcast).
 *
 * Schedule is set in vercel.json (twice daily: 8 AM + 8 PM UTC).
 *
 * Required Vercel environment variables:
 *   VITE_TELEGRAM_BOT_TOKEN    — your Telegram bot token
 *   UPSTASH_REDIS_REST_URL     — Upstash Redis REST endpoint
 *   UPSTASH_REDIS_REST_TOKEN   — Upstash Redis REST token
 *   CRON_SECRET                — a random secret to prevent unauthorised calls
 *
 * Optional:
 *   TELEGRAM_CHAT_ID           — fallback: owner's personal chat or a channel
 *   VITE_GROQ_API_KEY          — enables AI verdicts in the digest
 */

export const config = { maxDuration: 30 };

const DEFILLAMA   = "https://yields.llama.fi/pools";
const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
const REDIS_KEY   = "fleepit:subscribers";

// ── Upstash Redis REST ────────────────────────────────────────────────────────
async function redis(command) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return res.json();
}

async function getAllSubscribers() {
  const res = await redis(["SMEMBERS", REDIS_KEY]);
  return res?.result || [];
}

// ── Pool helpers ──────────────────────────────────────────────────────────────
function classifyRisk(pool) {
  const apy = pool.apy ?? 0;
  const tvl = pool.tvlUsd ?? 0;
  if (tvl < 100_000 || apy > 200) return "high";
  if (apy > 50 || tvl < 1_000_000) return "medium";
  return "low";
}

async function fetchVerdict(pool, groqKey) {
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `In exactly one sentence (no markdown), give a DeFi investor verdict on this Mantle pool: ${pool.project} / ${pool.symbol}, APY: ${(pool.apy ?? 0).toFixed(2)}%, TVL: $${Math.round(pool.tvlUsd ?? 0).toLocaleString()}.`,
        }],
        max_tokens: 80,
        temperature: 0.3,
      }),
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

// ── Send message to one chat ──────────────────────────────────────────────────
async function sendToChat(token, chatId, message) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const json = await r.json();
    return json.ok;
  } catch {
    return false;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Verify the request comes from Vercel cron or an authorised caller
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(200).json({ ok: true, skipped: "No bot token configured" });
  }

  try {
    // ── 1. Collect all recipients ─────────────────────────────────────────────
    const subscribers = await getAllSubscribers();
    const ownerChatId = process.env.TELEGRAM_CHAT_ID;

    // Merge: all Redis subscribers + owner fallback (deduplicated)
    const recipients = new Set(subscribers.map(String));
    if (ownerChatId) recipients.add(String(ownerChatId));

    if (recipients.size === 0) {
      return res.status(200).json({ ok: true, skipped: "No subscribers yet" });
    }

    // ── 2. Fetch live Mantle pools ────────────────────────────────────────────
    const r    = await fetch(DEFILLAMA);
    const json = await r.json();
    const pools = (json.data || [])
      .filter((p) => p.chain === "Mantle")
      .filter((p) => classifyRisk(p) !== "high")
      .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
      .slice(0, 5);

    if (pools.length === 0) {
      return res.status(200).json({ ok: true, skipped: "No Mantle pools found" });
    }

    // ── 3. Get AI verdicts in parallel ────────────────────────────────────────
    const groqKey  = process.env.VITE_GROQ_API_KEY || "";
    const verdicts = groqKey
      ? await Promise.all(pools.map((p) => fetchVerdict(p, groqKey)))
      : pools.map(() => "");

    // ── 4. Build message ──────────────────────────────────────────────────────
    const now   = new Date().toUTCString().slice(0, 16);
    const lines = pools.map((p, i) => {
      const verdict = verdicts[i] ? `\n   _${verdicts[i]}_` : "";
      return `${i + 1}. *${p.symbol}* on ${p.project} — ${(p.apy ?? 0).toFixed(2)}% APY | TVL $${((p.tvlUsd ?? 0) / 1e6).toFixed(1)}M${verdict}`;
    }).join("\n\n");

    const message =
      `🔔 *Fleepit Yield Brief* — ${now}\n\n` +
      `Top Mantle opportunities right now:\n\n${lines}\n\n` +
      `[Open Fleepit →](https://fleepit.vercel.app)`;

    // ── 5. Send to ALL subscribers ────────────────────────────────────────────
    const results = await Promise.allSettled(
      [...recipients].map((chatId) => sendToChat(token, chatId, message))
    );

    const sent   = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.length - sent;

    return res.status(200).json({ ok: true, sent, failed, total: recipients.size });
  } catch (e) {
    console.error("alert-cron error:", e);
    return res.status(500).json({ error: e.message });
  }
}
