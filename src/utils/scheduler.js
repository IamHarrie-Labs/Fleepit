import { classifyRisk } from "../components/dashboard/PoolCard";
import { sendTelegramAlert } from "./telegram";
import { GEMINI_API_KEY } from "../config";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const LS_FREQ = "fleepit_notify_freq";   // "off" | "daily" | "weekly"
const LS_LAST = "fleepit_last_notified"; // ISO timestamp string

function isDue(freq, lastISO) {
  if (!freq || freq === "off") return false;
  if (!lastISO) return true; // never sent — send now
  const elapsed = Date.now() - new Date(lastISO).getTime();
  if (freq === "daily") return elapsed >= 24 * 60 * 60 * 1000;
  if (freq === "weekly") return elapsed >= 7 * 24 * 60 * 60 * 1000;
  return false;
}

function getTopPools(pools) {
  return pools
    .filter((p) => classifyRisk(p) !== "high")
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, 3);
}

async function fetchVerdict(pool) {
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: `In exactly one sentence (no markdown, no asterisks), give a DeFi investor verdict on this Mantle pool: ${pool.project} / ${pool.symbol}, APY: ${(pool.apy ?? 0).toFixed(2)}%, TVL: $${Math.round(pool.tvlUsd ?? 0).toLocaleString()}.`,
          },
        ],
        max_tokens: 80,
        temperature: 0.3,
      }),
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? "No verdict available.";
  } catch {
    return "Verdict unavailable.";
  }
}

export async function checkAndSendScheduledAlerts(pools) {
  const freq = localStorage.getItem(LS_FREQ) || "off";
  const last = localStorage.getItem(LS_LAST);

  if (!isDue(freq, last)) return;
  if (!pools || pools.length === 0) return;

  const top = getTopPools(pools);
  if (top.length === 0) return;

  // Fetch all verdicts in parallel
  const verdicts = await Promise.all(top.map(fetchVerdict));

  const label = freq === "daily" ? "Daily" : "Weekly";
  const lines = top
    .map(
      (pool, i) =>
        `${i + 1}. *${pool.symbol}* (${pool.project}) — ${(pool.apy ?? 0).toFixed(2)}% APY\n   ${verdicts[i]}`
    )
    .join("\n\n");

  const message = `🔔 *Fleepit ${label} Brief*\n\nTop investment-grade Mantle pools right now:\n\n${lines}\n\n_Powered by Fleepit · mantle.fleepit.app_`;

  const userChatId = localStorage.getItem("fleepit_telegram_chat_id") || undefined;
  await sendTelegramAlert(message, userChatId);
  localStorage.setItem(LS_LAST, new Date().toISOString());
}
