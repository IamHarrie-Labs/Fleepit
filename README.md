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
- Latest Mantle news headlines, pulled live, newest first
- General questions about Mantle, answered as context rather than a live reading

Questions can be typed or spoken (browser voice input). Every answer this session is captured as a flip card underneath the result — tap one to flip it and see the full analysis again, or share it straight to X.

## How it works

The browser runs a multi-step tool-calling loop on Groq (Llama 3.1 8B Instant). The model decides which of the live tools it needs (a scoped subset per question, not all of them every time), reads the results, and can call more before writing a final answer, streamed token by token. Conversation memory persists across a page reload (saved to the browser), so follow-up questions still resolve correctly after a refresh.

Every section you interact with — Research, Alerts — reflects in the URL (`/research`, `/alerts`) via the History API, no hash fragments; direct loads and the browser back/forward buttons both work correctly.

| Layer | File | Role |
|---|---|---|
| Agent loop | `src/lib/researchAgent.js` | Groq function-calling, retries, malformed-call recovery, greeting guard |
| Tools | `src/lib/agentTools.js` | Live fetchers for DeFiLlama, CoinGecko, and Mantle RPC |
| Server tools | `api/agent-tool.js` | Etherscan V2 lookups (wallet holdings, tx history) so the key stays server-side |
| Terminal UI | `src/pages/FleepitApp.jsx` | Search, live step feed, result tables, SVG charts, analysis, flip-card history |
| News | `api/agent-tool.js` (`get_mantle_news`) | Latest Mantle headlines via Google News RSS, no key needed |
| Alerts | `api/alert-cron.js`, `api/telegram-webhook.js` | Telegram bot: yield briefs, new-pool and APY-surge alerts |
| On-chain identity | `api/agent-card.js`, `src/lib/agentIdentity.js`, `scripts/identity-registry/` | Optional ERC-8004-style on-chain identity for the agent itself (see below) |

Data sources: DeFiLlama (pools, protocols, chain TVL), CoinGecko (token markets, MNT), Mantle RPC at `rpc.mantle.xyz` (gas, blocks, balances), Etherscan V2 with `chainid=5000` (holdings, transactions), Google News RSS (headlines). All public APIs; only Groq and Etherscan need keys.

## On-chain agent identity (ERC-8004)

Fleepit can register itself on Mantle with a real, verifiable on-chain identity, following the shape of ERC-8004 ("Trustless Agents"): a minted token whose `tokenURI` resolves to an agent registration file (`api/agent-card.js`, built live from the same tool list the LLM uses, so it can't go stale). Mantle has no official ERC-8004 deployment yet, so `scripts/identity-registry/` ships a small standalone Identity Registry contract with the same `register`/`tokenURI` interface, deployed independently.

This is entirely optional and inert until deployed: with no registry address configured, the "Agent Identity" badge in the footer simply doesn't render — no placeholder, no fake identity. See `scripts/identity-registry/README.md` to deploy it yourself (testnet first, recommended).

## The Agent Skill

The same research capability also ships as a portable, dependency-free Agent Skill in [`skills/mantle-yield-research`](skills/mantle-yield-research), following the open SKILL.md standard that Mantle's own AI Agent Skills stack builds on. Any SKILL.md-compatible agent (Claude Code, Codex CLI, Gemini CLI) can fork it and run Mantle research from the terminal with no API keys. This is a separate, parallel implementation of the same capabilities — the website doesn't execute this file, since a browser has no mechanism to run a SKILL.md; the two are kept at feature parity by hand.

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
- `VITE_IDENTITY_REGISTRY_ADDRESS`, `VITE_AGENT_TOKEN_ID`, `VITE_AGENT_CHAIN_ID`, `IDENTITY_REGISTRY_ADDRESS`, `AGENT_ONCHAIN_ADDRESS`, `MANTLE_CHAIN_ID` — optional; set only after deploying the on-chain identity contract (see above)

Note: the wallet holdings and transaction-history tools call Vercel serverless functions, so they respond fully on the deployed site (or `vercel dev`), not under plain `vite` dev.

## Deploying

The repo deploys as-is on Vercel. `vercel.json` schedules the twice-daily Telegram yield brief; add the environment variables above in the Vercel dashboard.
