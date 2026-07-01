# Data sources & schemas

All sources are public and require no API key. Node >= 18 (global `fetch`).

## DeFiLlama Yields — pool list
`GET https://yields.llama.fi/pools`

Returns `{ status, data: Pool[] }`. Filter `data` to `chain === "Mantle"`.
Relevant `Pool` fields:

| field | meaning |
|---|---|
| `pool` | uuid — the pool id used by the chart endpoint |
| `chain` | e.g. `"Mantle"` |
| `project` | protocol slug, e.g. `aave-v3`, `merchantmoe` |
| `symbol` | token/pair, e.g. `USDC`, `USDT0-VOOI` |
| `apy` | total APY % (base + reward) |
| `apyBase` / `apyReward` | yield composition — reward-heavy = incentive-driven |
| `tvlUsd` | total value locked, USD |
| `stablecoin` | boolean — lowest price risk when true |
| `ilRisk` | `"yes"` / `"no"` — impermanent-loss exposure |
| `exposure` | `single` / `multi` |
| `predictions.predictedClass` | DeFiLlama's model: `Stable/Up` or `Down` |

## DeFiLlama Yields — pool history
`GET https://yields.llama.fi/chart/{poolId}`

Returns `{ status, data: [{ timestamp, apy, tvlUsd }] }`, one point per day.
Use the last 30 points to compute APY stability (coefficient of variation) and
TVL direction (inflow/outflow).

## DeFiLlama — chain TVL
`GET https://api.llama.fi/v2/historicalChainTvl/Mantle`

Returns `[{ date, tvl }]`. Compare the latest point to 7 and 30 points back for
flow direction.

`GET https://api.llama.fi/v2/chains` → `[{ name, tvl, ... }]`, used to rank
Mantle among all chains by TVL.

## CoinGecko — MNT price
`GET https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`

Returns `{ mantle: { usd, usd_24h_change, usd_market_cap } }`.

## Mantle network facts
- Chain id: **5000**
- RPC: `https://rpc.mantle.xyz`
- Explorer: `https://explorer.mantle.xyz`
- Native token: **MNT**

## Interpretation cheatsheet (the alpha)
- **APY at/near its 30-day max while TVL is in outflow** → incentives cranked to
  offset an exodus. Red flag, not opportunity. (Real example seen while building
  this skill: Aave-v3 GHO on Mantle showed 9.74% APY at its 30d high while TVL
  fell ~65% — a trap a plain dashboard wouldn't surface.)
- **`apyReward` >> `apyBase`** → yield depends on emissions that can taper.
- **`predictedClass: "Down"`** → expect the yield to fall.
- **High APY + TVL < $100k** → illiquid, exit-liquidity risk.
