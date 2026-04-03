/**
 * Telegram Webhook — receives messages when users interact with the Fleepit bot.
 *
 * /start  → subscribes the user (saves their chat ID)
 * /stop   → unsubscribes the user (removes their chat ID)
 * /status → tells the user if they're subscribed
 *
 * Subscribers are stored in Upstash Redis (free tier).
 *
 * Setup:
 *  1. Create a free Upstash Redis database at console.upstash.com
 *  2. Copy the REST URL and REST Token into Vercel env vars:
 *     UPSTASH_REDIS_REST_URL   = https://xxxx.upstash.io
 *     UPSTASH_REDIS_REST_TOKEN = AXxx...
 *  3. Set the Telegram webhook to point to this endpoint:
 *     https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://fleepit.vercel.app/api/telegram-webhook
 */

export const config = { maxDuration: 10 };

// ── Upstash Redis REST helpers ────────────────────────────────────────────────
const REDIS_KEY = "fleepit:subscribers";

async function redis(command) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return res.json();
}

async function addSubscriber(chatId) {
  return redis(["SADD", REDIS_KEY, String(chatId)]);
}

async function removeSubscriber(chatId) {
  return redis(["SREM", REDIS_KEY, String(chatId)]);
}

async function isSubscribed(chatId) {
  const res = await redis(["SISMEMBER", REDIS_KEY, String(chatId)]);
  return res?.result === 1;
}

// ── Send a reply to the user ──────────────────────────────────────────────────
async function reply(chatId, text) {
  const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

// ── Webhook handler ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const update  = req.body;
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      return res.status(200).json({ ok: true });
    }

    const chatId  = message.chat.id;
    const command = message.text.trim().toLowerCase();
    const name    = message.from?.first_name || "there";

    switch (command) {
      case "/start": {
        await addSubscriber(chatId);
        await reply(chatId,
          `👋 Hey ${name}! Welcome to *Fleepit*.\n\n` +
          `You're now subscribed to live Mantle yield alerts. You'll receive:\n` +
          `• 🔔 Twice-daily yield briefs (top pools + AI verdicts)\n` +
          `• ⚡ APY surge alerts when pools spike\n` +
          `• 🆕 New pool notifications\n\n` +
          `Commands:\n` +
          `/stop — unsubscribe from alerts\n` +
          `/status — check your subscription\n\n` +
          `_Powered by Fleepit · fleepit.vercel.app_`
        );
        break;
      }

      case "/stop": {
        await removeSubscriber(chatId);
        await reply(chatId,
          `✅ You've been unsubscribed from Fleepit alerts.\n\n` +
          `You can re-subscribe anytime by sending /start.`
        );
        break;
      }

      case "/status": {
        const subscribed = await isSubscribed(chatId);
        await reply(chatId,
          subscribed
            ? `✅ You're subscribed to Fleepit alerts.\n\nSend /stop to unsubscribe.`
            : `❌ You're not currently subscribed.\n\nSend /start to subscribe.`
        );
        break;
      }

      default: {
        await reply(chatId,
          `I'm the *Fleepit Bot* — I send live Mantle yield alerts.\n\n` +
          `Commands:\n` +
          `/start — subscribe to alerts\n` +
          `/stop — unsubscribe\n` +
          `/status — check subscription\n\n` +
          `_fleepit.vercel.app_`
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("telegram-webhook error:", e);
    return res.status(200).json({ ok: true }); // always 200 so Telegram doesn't retry
  }
}
