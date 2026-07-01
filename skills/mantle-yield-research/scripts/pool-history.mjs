#!/usr/bin/env node
/**
 * pool-history.mjs — 30-day APY/TVL history + stability read for one pool.
 *
 * Usage:  node pool-history.mjs <poolId>
 *   <poolId> is the DeFiLlama pool uuid (from fetch-pools.mjs output).
 *
 * Dependency-free. Node >= 18. No API key.
 * Prints JSON: { pool_id, apy{stability,...}, tvl{direction,...}, source }.
 *
 * This is the trap-detector: it tells you whether a headline APY is a durable
 * yield or a fleeting incentive spike, and whether liquidity is arriving or
 * fleeing.
 */

const CHART_URL = "https://yields.llama.fi/chart"; // /{poolId}

async function main() {
  const poolId = process.argv[2];
  if (!poolId) {
    process.stderr.write("Usage: node pool-history.mjs <poolId>\n");
    process.exit(1);
  }

  const res = await fetch(`${CHART_URL}/${poolId}`);
  if (!res.ok) throw new Error(`History request failed: ${res.status}`);
  const { data = [] } = await res.json();

  const series = data.filter((d) => d.apy != null);
  if (series.length === 0) {
    print({ pool_id: poolId, note: "No history points returned.", source: srcOf(poolId) });
    return;
  }

  const w = series.slice(-30);
  const apys = w.map((d) => d.apy);
  const first = w[0];
  const last = w[w.length - 1];

  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const apyAvg = avg(apys);
  const std = Math.sqrt(avg(apys.map((x) => (x - apyAvg) ** 2)));
  const cov = apyAvg > 0 ? std / apyAvg : 0;

  print({
    pool_id: poolId,
    window_days: w.length,
    apy: {
      current: round(last.apy),
      avg_30d: round(apyAvg),
      min_30d: round(Math.min(...apys)),
      max_30d: round(Math.max(...apys)),
      stability: cov < 0.15 ? "stable" : cov < 0.4 ? "moderate" : "volatile",
      volatility_cov: round(cov, 3),
    },
    tvl: {
      current: Math.round(last.tvlUsd ?? 0),
      start_of_window: Math.round(first.tvlUsd ?? 0),
      change_pct:
        first.tvlUsd > 0
          ? round(((last.tvlUsd - first.tvlUsd) / first.tvlUsd) * 100)
          : null,
      direction: (last.tvlUsd ?? 0) >= (first.tvlUsd ?? 0) ? "inflow" : "outflow",
    },
    source: srcOf(poolId),
  });
}

const srcOf = (id) => `DeFiLlama Yields chart (yields.llama.fi/chart/${id})`;
function round(n, d = 2) {
  if (n == null || Number.isNaN(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function print(o) { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); }

main().catch((e) => {
  process.stderr.write(`Error: ${e.message}\n`);
  process.exit(1);
});
