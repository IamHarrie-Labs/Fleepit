// ── Groq AI ───────────────────────────────────────────────────────────────────
export const GEMINI_API_KEY = import.meta.env.VITE_GROQ_API_KEY  || "";
export const GEMINI_MODEL   = import.meta.env.VITE_GROQ_MODEL    || "llama-3.3-70b-versatile";

// ── Telegram ──────────────────────────────────────────────────────────────────
export const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "";

// ── EmailJS ───────────────────────────────────────────────────────────────────
export const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || "";
export const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
export const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || "";
