import { TELEGRAM_BOT_TOKEN } from "../config";

// Fallback chat ID for owner-level alerts (e.g. new subscriber notifications).
// Users set their own Chat ID via Subscribe → Notification Preferences.
const FALLBACK_CHAT_ID = "YOUR_CHAT_ID";

/**
 * Send a Telegram message via the configured bot.
 * @param {string} message  - Markdown-formatted message text
 * @param {string} [chatId] - User's personal Chat ID (from localStorage). Falls back to FALLBACK_CHAT_ID.
 *
 * Guard clauses silently bail when credentials are still placeholders —
 * prevents DevTools noise during dev/demo with no real bot configured.
 */
export const sendTelegramAlert = async (message, chatId) => {
  const resolvedChatId = chatId || FALLBACK_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_BOT_TOKEN") return;
  if (!resolvedChatId || resolvedChatId === "YOUR_CHAT_ID") return;

  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: resolvedChatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );
  } catch {
    // Fire-and-forget — never block the UI on Telegram failures
  }
};
