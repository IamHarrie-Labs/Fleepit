---
name: mantle-yield-research
description: Research yield opportunities and capital flows on the Mantle blockchain (chain id 5000). Use when asked to find, compare, or risk-assess Mantle DeFi pools, judge whether a yield is sustainable, or explain why TVL/capital is moving on Mantle. Pulls LIVE data from DeFiLlama and CoinGecko — never guesses numbers.
license: MIT
---

# Mantle Yield Research

A portable Agent Skill that turns any SKILL.md-compatible agent (Claude Code,
Codex CLI, Gemini CLI, …) into an on-chain research analyst for the **Mantle**
ecosystem. It is the same capability that powers the *Fleepit Analyst*, packaged
so anyone can fork it and run their own Mantle research agent.

The golden rule this skill enforces: **evidence before opinion.** Every APY, TVL
or trend must come from a live tool call, and every figure is cited to its
source. If the data isn't there, say so — never invent a number.

## When to use

Trigger this skill when the task involves any of:
- Finding or ranking yield pools on Mantle ("safest 8%+ stablecoin pools").
- Comparing pools ("stMNT staking vs the top USDC LP for a conservative investor").
- Judging yield **sustainability** (is this a durable yield or a fading incentive spike?).
- Explaining **capital flows** ("why is TVL leaving Mantle this month?").
- Producing a proactive Mantle market brief.

## The research workflow

Follow these steps in order. Do not skip straight to an answer.

1. **Macro context first.** Run `scripts/chain-metrics.mjs` to get chain TVL,
   7d/30d flow direction, and MNT price. This frames everything.
2. **Survey the field.** Run `scripts/fetch-pools.mjs` with the right filters
   (`--max-risk`, `--stablecoin`, `--min-tvl`, `--sort apy|tvl`) to list candidates.
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

# 2) Top 5 low-risk pools by APY, min $500k TVL
node scripts/fetch-pools.mjs --max-risk low --min-tvl 500000 --limit 5 --sort apy

# 3) Only stablecoin pools (lowest price risk)
node scripts/fetch-pools.mjs --stablecoin --limit 8

# 4) 30-day APY/TVL history + stability read for one pool
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
