/**
 * Vercel Cron Job — runs on a schedule even when no one is on the site.
 * Fetches live Mantle pool data, picks the top opportunities,
 * and sends a Telegram digest to the configured chat ID.
 *
 * Schedule is set in vercel.json (twice daily: 8 AM + 8 PM UTC).
 *
 * Required Vercel environment variables:
 *   VITE_TELEGRAM_BOT_TOKEN  — your Telegram bot token
 *   TELEGRAM_CHAT_ID         — the chat/group ID to send digests to
 *   CRON_SECRET              — a random secret to prevent unauthorised calls
 */

export const config = { maxDuration: 30 };

const DEFILLAMA = "https://yields.llama.fi/pools";
const GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions";

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

export default async function handler(req, res) {
  // Verify the request comes from Vercel cron or an authorised caller
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const token  = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(200).json({ ok: true, skipped: "No Telegram credentials configured" });
  }

  try {
    // ── 1. Fetch live Mantle pools ────────────────────────────────────────────
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

    // ── 2. Get AI verdicts in parallel (best-effort) ──────────────────────────
    const groqKey = process.env.VITE_GROQ_API_KEY || "";
    const verdicts = groqKey
      ? await Promise.all(pools.map((p) => fetchVerdict(p, groqKey)))
      : pools.map(() => "");

    // ── 3. Build the Telegram message ─────────────────────────────────────────
    const now   = new Date().toUTCString().slice(0, 16);
    const lines = pools.map((p, i) => {
      const verdict = verdicts[i] ? `\n   _${verdicts[i]}_` : "";
      return `${i + 1}. *${p.symbol}* on ${p.project} — ${(p.apy ?? 0).toFixed(2)}% APY | TVL $${(( p.tvlUsd ?? 0) / 1e6).toFixed(1)}M${verdict}`;
    }).join("\n\n");

    const message = `🔔 *Fleepit Yield Brief* — ${now}\n\nTop Mantle opportunities right now:\n\n${lines}\n\n[Open Fleepit →](https://fleepit.vercel.app)`;

    // ── 4. Send to Telegram ───────────────────────────────────────────────────
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown", disable_web_page_preview: true }),
    });

    const tgJson = await tgRes.json();
    return res.status(200).json({ ok: true, telegram: tgJson.ok });
  } catch (e) {
    console.error("alert-cron error:", e);
    return res.status(500).json({ error: e.message });
  }
}
