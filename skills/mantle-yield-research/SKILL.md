---
name: mantle-yield-research
description: Research the full Mantle blockchain ecosystem (chain id 5000) — tokens, DeFi protocols, yield pools, and capital flows. Use when asked to find or rank tokens/pools/protocols on Mantle, compare assets, judge whether a yield is sustainable, or explain why TVL/capital is moving on Mantle. Pulls LIVE data from DeFiLlama and CoinGecko — never guesses numbers, and excludes stablecoins from growth/investment picks by default.
license: MIT
---

# Mantle Research

A portable Agent Skill that turns any SKILL.md-compatible agent (Claude Code,
Codex CLI, Gemini CLI, …) into an on-chain research analyst for the **Mantle**
ecosystem. It is the same capability that powers the *Fleepit Analyst*, packaged
so anyone can fork it and run their own Mantle research agent. Format is the
open Agent Skills standard — the same one Mantle's own AI Agent Skills /
Agent Scaffold stack (built with Questflow) is built on.

The golden rule this skill enforces: **evidence before opinion.** Every price,
APY, TVL or trend must come from a live tool call, and every figure is cited to
its source. If the data isn't there, say so — never invent a number.

## When to use

Trigger this skill when the task involves any of:
- Finding good tokens to invest in, or ranking tokens by price/momentum/cap ("top 3 tokens on Mantle", "good tokens to invest in").
- Finding or ranking yield pools on Mantle ("safest 8%+ stablecoin pools").
- Ranking DeFi protocols by TVL ("biggest protocols on Mantle").
- Comparing assets ("stMNT staking vs the top USDC LP for a conservative investor", "LINK vs MNT").
- Judging yield **sustainability** (is this a durable yield or a fading incentive spike?).
- Explaining **capital flows** ("why is TVL leaving Mantle this month?").
- Producing a proactive Mantle market brief.

**Stablecoin rule:** when the task is about growth/investment ("good tokens to invest in"), exclude dollar-pegged stablecoins (USDT, USDC, USD1, USDe, USDY, sUSDe, etc.) — they don't appreciate. Only include them if the user explicitly asks about stablecoins or parking cash. `fetch-tokens.mjs` does this filtering in code by default; don't override it unless asked.

## The research workflow

Follow these steps in order. Do not skip straight to an answer.

1. **Macro context first.** Run `scripts/chain-metrics.mjs` to get chain TVL,
   7d/30d flow direction, and MNT price. This frames everything.
2. **Survey the field.** Depending on the question:
   - Tokens: `scripts/fetch-tokens.mjs` (stablecoins excluded by default).
   - Pools: `scripts/fetch-pools.mjs` with the right filters (`--max-risk`,
     `--stablecoin`, `--min-tvl`, `--sort apy|tvl`).
   - Protocols: `scripts/fetch-protocols.mjs` (optionally `--category`).
   - Named comparison: `scripts/compare-assets.mjs <a> <b> [c...]`.
3. **Stress-test the top candidates.** For the 2–4 most interesting pools, run
   `scripts/pool-history.mjs <poolId>` to see whether APY is **stable** or
   **volatile**, and whether TVL is in **inflow** or **outflow**. This is where
   you catch the traps: a high APY on falling TVL usually means incentives are
   being cranked to mask an exodus — a red flag, not an opportunity.
4. **Synthesize.** Combine the evidence into a decisive recommendation. State
   who it suits (conservative / balanced / aggressive) and the key risk. Cite
   `[DeFiLlama]` / `[CoinGecko]` inline.

## Running the scripts

All scripts are dependency-free Node (>=18, uses global `fetch`). No API keys.

```bash
# 1) Chain health + MNT price
node scripts/chain-metrics.mjs

# 2) Top 5 tokens by 24h performance (stablecoins excluded by default)
node scripts/fetch-tokens.mjs --sort price_change_24h --limit 5

# 3) Top 5 low-risk pools by APY, min $500k TVL
node scripts/fetch-pools.mjs --max-risk low --min-tvl 500000 --limit 5 --sort apy

# 4) Only stablecoin pools (lowest price risk) — pools, not tokens
node scripts/fetch-pools.mjs --stablecoin --limit 8

# 5) Top protocols by TVL, optionally filtered by category
node scripts/fetch-protocols.mjs --category lending --limit 5

# 6) Compare named assets side by side (tokens, falls back to pools)
node scripts/compare-assets.mjs LINK MNT

# 7) 30-day APY/TVL history + stability read for one pool
#    (poolId comes from the fetch-pools output)
node scripts/pool-history.mjs 747c1d2a-c668-4682-b9f9-296708a3dd90
```

Each script prints structured JSON to stdout with a `source` field for citation.
Pipe or read the JSON, reason over it, then write the analysis.

## Interpreting the signals

| Signal | What it means |
|---|---|
| APY `stable` + TVL `inflow` | Durable, trusted yield. Best for conservative capital. |
| APY `volatile` + TVL `inflow` | Incentive-driven; watch for the reward taper. |
| APY rising + TVL `outflow` | ⚠️ Red flag — incentives cranked to offset an exodus. |
| High APY + tiny TVL (<$100k) | Illiquid / mercenary; exit liquidity risk. |
| `predictedClass: Down` | DeFiLlama's model expects the yield to fall soon. |

## Risk classification (consistent, transparent)

- **high** — impermanent-loss flagged, or APY > 50%
- **medium** — APY 15–50%
- **low** — APY < 15%, no IL risk

This is a deliberately simple, honest heuristic — a starting point for judgment,
not a substitute for it.

## Data sources

- DeFiLlama Yields — `https://yields.llama.fi/pools` and `/chart/{poolId}`
- DeFiLlama Chain TVL — `https://api.llama.fi/v2/historicalChainTvl/Mantle`
- CoinGecko — MNT spot price
- Mantle: chain id **5000**, RPC `https://rpc.mantle.xyz`, explorer `https://explorer.mantle.xyz`

See `references/data-sources.md` for response schemas.
