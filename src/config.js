// ── Groq AI (LLM behind the research agent) ──────────────────────────────────
export const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// ── Telegram (alerts bot) ─────────────────────────────────────────────────────
export const TELEGRAM_BOT_TOKEN    = import.meta.env.VITE_TELEGRAM_BOT_TOKEN    || "";
export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

// ── On-chain agent identity (ERC-8004 Identity Registry) ─────────────────────
// A public contract address/token id isn't a secret — the point of a
// verifiable identity is that it's checkable — so these are safe as VITE_ vars.
export const MANTLE_RPC_URL            = "https://rpc.mantle.xyz";
export const IDENTITY_REGISTRY_ADDRESS = import.meta.env.VITE_IDENTITY_REGISTRY_ADDRESS || "";
export const AGENT_TOKEN_ID            = import.meta.env.VITE_AGENT_TOKEN_ID || "0";
export const AGENT_CHAIN_ID            = Number(import.meta.env.VITE_AGENT_CHAIN_ID || 5003);
