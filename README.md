# Fleepit

An AI-native research agent for the Mantle ecosystem.

Live at **[fleepit.vercel.app](https://fleepit.vercel.app)**

Ask anything about Mantle in plain English. The agent plans its own research, calls live data tools, shows every step of its work, and answers with tables, charts, and a written analysis in which every number traces to a live source. Nothing is mocked and nothing is guessed.

## What it can research

- Tokens: prices, momentum, market caps for the Mantle ecosystem, with stablecoins excluded from investment picks by default
- DeFi protocols: TVL rankings, 7d/30d capital flows, categories
- Yield pools: APY, TVL, risk classification, and 30-day history to catch unsustainable yields
- Chain health: total TVL, flow direction, rank among chains, MNT price
- Gas and network state, live from Mantle RPC
- Any wallet address: type, native MNT balance, ERC-20 holdings, recent transactions
- Investment scenarios ("if I invest $1,000 for 6 months") and side-by-side comparisons
- General questions about Mantle, answered as context rather than a live reading

Questions can be typed or spoken (browser voice input).

## How it works

The browser runs a multi-step tool-calling loop on Groq (Llama 3.3 70B). The model decides which of nine live tools it needs, reads the results, and can call more before writing a final answer.

| Layer | File | Role |
|---|---|---|
| Agent loop | `src/lib/researchAgent.js` | Groq function-calling, retries, malformed-call recovery, greeting guard |
| Tools | `src/lib/agentTools.js` | Live fetchers for DeFiLlama, CoinGecko, and Mantle RPC |
| Server tools | `api/agent-tool.js` | Etherscan V2 lookups (wallet holdings, tx history) so the key stays server-side |
| Terminal UI | `src/pages/FleepitApp.jsx` | Search, live step feed, result tables, SVG charts, analysis |
| Alerts | `api/alert-cron.js`, `api/telegram-webhook.js` | Telegram bot: yield briefs, new-pool and APY-surge alerts |

Data sources: DeFiLlama (pools, protocols, chain TVL), CoinGecko (token markets, MNT), Mantle RPC at `rpc.mantle.xyz` (gas, blocks, balances), Etherscan V2 with `chainid=5000` (holdings, transactions). All public APIs; only Groq and Etherscan need keys.

## The Agent Skill

The same research capability ships as a portable, dependency-free Agent Skill in [`skills/mantle-yield-research`](skills/mantle-yield-research), following the open SKILL.md standard that Mantle's own AI Agent Skills stack builds on. Any SKILL.md-compatible agent (Claude Code, Codex CLI, Gemini CLI) can fork it and run Mantle research from the terminal with no API keys.

## Running locally

```bash
npm install
cp .env.example .env   # fill in VITE_GROQ_API_KEY at minimum
npm run dev
```

Environment variables (see `.env.example`):

- `VITE_GROQ_API_KEY` — required; free at console.groq.com
- `ETHERSCAN_API_KEY` — optional; enables wallet holdings and tx history (server-side only)
- `VITE_TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHAT_ID`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — optional; power the Telegram alerts pipeline

Note: the wallet holdings and transaction-history tools call Vercel serverless functions, so they respond fully on the deployed site (or `vercel dev`), not under plain `vite` dev.

## Deploying

The repo deploys as-is on Vercel. `vercel.json` schedules the twice-daily Telegram yield brief; add the environment variables above in the Vercel dashboard.
