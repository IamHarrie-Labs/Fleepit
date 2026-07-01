#!/usr/bin/env node
/**
 * compare-assets.mjs — Side-by-side comparison of 2-5 Mantle tokens or pools.
 *
 * Usage:
 *   node compare-assets.mjs <name1> <name2> [name3...]
 *
 * Tries to resolve each name against live Mantle tokens first (CoinGecko),
 * then falls back to yield pools (DeFiLlama) for any that don't match.
 *
 * Dependency-free. Node >= 18 (global fetch). No API key.
 */

const MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=mantle-ecosystem&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d";
const POOLS_URL = "https://yields.llama.fi/pools";

function classifyRisk(p) {
  const apy = p.apy ?? 0;
  if (p.ilRisk === "yes" || apy > 50) return "high";
  if (apy > 15) return "medium";
  return "low";
}

async function main() {
  const queries = process.argv.slice(2);
  if (queries.length < 2) {
    process.stderr.write("Usage: node compare-assets.mjs <name1> <name2> [name3...]\n");
    process.exit(1);
  }

  const tokenRows = [];
  try {
    const res = await fetch(MARKETS_URL);
    if (res.ok) {
      const tokens = await res.json();
      for (const q of queries) {
        const ql = q.toLowerCase();
        const t = tokens.find((x) => x.id === ql || x.symbol?.toLowerCase() === ql || x.name?.toLowerCase() === ql);
        if (t) tokenRows.push({
          name: t.name, symbol: (t.symbol || "").toUpperCase(),
          price_usd: t.current_price,
          market_cap_usd: t.market_cap,
          change_24h_pct: round(t.price_change_percentage_24h),
          change_7d_pct: round(t.price_change_percentage_7d_in_currency),
        });
      }
    }
  } catch { /* fall through to pools */ }

  const matched = new Set(tokenRows.map((t) => t.symbol.toLowerCase()));
  const missing = queries.filter((q) => !matched.has(q.toLowerCase()));
  const poolRows = [];
  if (missing.length) {
    const res = await fetch(POOLS_URL);
    if (res.ok) {
      const { data = [] } = await res.json();
      const pools = data.filter((p) => (p.chain || "").toLowerCase() === "mantle");
      for (const q of missing) {
        const ql = q.toLowerCase();
        const p = pools.find((x) => x.pool === q || x.symbol?.toLowerCase() === ql || x.project?.toLowerCase() === ql);
        if (p) poolRows.push({
          project: p.project, symbol: p.symbol,
          apy: round(p.apy), tvlUsd: Math.round(p.tvlUsd ?? 0),
          risk: classifyRisk(p),
        });
      }
    }
  }

  print({
    compared: tokenRows.length + poolRows.length,
    tokens: tokenRows.length ? tokenRows : undefined,
    pools: poolRows.length ? poolRows : undefined,
    source: "CoinGecko (mantle-ecosystem) + DeFiLlama Yields",
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
