#!/usr/bin/env node
/**
 * fetch-pools.mjs — List live yield pools on Mantle from DeFiLlama.
 *
 * Usage:
 *   node fetch-pools.mjs [--max-risk low|medium|high] [--stablecoin]
 *                        [--min-tvl <usd>] [--sort apy|tvl] [--limit <n>]
 *
 * Dependency-free. Requires Node >= 18 (global fetch). No API key.
 * Prints JSON to stdout: { count, returned, pools[], source }.
 */

const POOLS_URL = "https://yields.llama.fi/pools";
const RISK_RANK = { low: 0, medium: 1, high: 2 };

function classifyRisk(p) {
  const apy = p.apy ?? 0;
  if (p.ilRisk === "yes" || apy > 50) return "high";
  if (apy > 15) return "medium";
  return "low";
}

function parseArgs(argv) {
  const a = { sort: "apy", limit: 8 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--max-risk") a.maxRisk = argv[++i];
    else if (k === "--stablecoin") a.stablecoin = true;
    else if (k === "--min-tvl") a.minTvl = Number(argv[++i]);
    else if (k === "--sort") a.sort = argv[++i];
    else if (k === "--limit") a.limit = Number(argv[++i]);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const res = await fetch(POOLS_URL);
  if (!res.ok) throw new Error(`DeFiLlama request failed: ${res.status}`);
  const { data = [] } = await res.json();

  let pools = data.filter((p) => (p.chain || "").toLowerCase() === "mantle");
  if (args.stablecoin) pools = pools.filter((p) => p.stablecoin);
  if (args.maxRisk) {
    const cap = RISK_RANK[args.maxRisk] ?? 2;
    pools = pools.filter((p) => RISK_RANK[classifyRisk(p)] <= cap);
  }
  if (Number.isFinite(args.minTvl))
    pools = pools.filter((p) => (p.tvlUsd ?? 0) >= args.minTvl);

  const key = args.sort === "tvl" ? "tvlUsd" : "apy";
  pools.sort((x, y) => (y[key] ?? 0) - (x[key] ?? 0));

  const out = pools.slice(0, Math.max(1, args.limit)).map((p) => ({
    id: p.pool,
    project: p.project,
    symbol: p.symbol,
    apy: round(p.apy),
    apyBase: round(p.apyBase),
    apyReward: round(p.apyReward),
    tvlUsd: Math.round(p.tvlUsd ?? 0),
    stablecoin: !!p.stablecoin,
    ilRisk: p.ilRisk ?? "unknown",
    risk: classifyRisk(p),
    predictedClass: p.predictions?.predictedClass ?? null,
  }));

  print({
    count: pools.length,
    returned: out.length,
    filters: args,
    pools: out,
    source: "DeFiLlama Yields (yields.llama.fi/pools), chain=Mantle",
  });
}

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
