#!/usr/bin/env node
/**
 * fetch-tokens.mjs — Top tokens in the Mantle ecosystem, live from CoinGecko.
 *
 * Usage:
 *   node fetch-tokens.mjs [--sort market_cap|price_change_24h|price_change_7d|volume]
 *                         [--limit <n>] [--include-stablecoins]
 *
 * Dependency-free. Node >= 18 (global fetch). No API key.
 *
 * By default this EXCLUDES dollar-pegged stablecoins (USDT, USDC, USD1, USDe,
 * etc.) since they don't appreciate and are not a growth/investment asset.
 * Pass --include-stablecoins only when the user explicitly wants them.
 */

const MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=mantle-ecosystem&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d";

const STABLECOIN_SYMBOLS = new Set([
  "usdt", "usdc", "dai", "busd", "usd1", "usde", "usdt0", "usdy", "susde",
  "tusd", "fdusd", "usdd", "gusd", "usdp", "lusd", "frax", "gho", "usds",
  "pyusd", "usda", "usdx", "usr", "usde0",
]);

function isStablecoin(t) {
  const sym = (t.symbol || "").toLowerCase();
  if (STABLECOIN_SYMBOLS.has(sym)) return true;
  const nearDollar = t.current_price >= 0.97 && t.current_price <= 1.03;
  const looksStable = /usd/i.test(t.symbol || "") || /usd/i.test(t.name || "");
  return nearDollar && looksStable;
}

function parseArgs(argv) {
  const a = { sort: "market_cap", limit: 8 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--sort") a.sort = argv[++i];
    else if (k === "--limit") a.limit = Number(argv[++i]);
    else if (k === "--include-stablecoins") a.includeStablecoins = true;
  }
  return a;
}

const SORT_KEYS = {
  market_cap: "market_cap",
  price_change_24h: "price_change_percentage_24h",
  price_change_7d: "price_change_percentage_7d_in_currency",
  volume: "total_volume",
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const res = await fetch(MARKETS_URL);
  if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);
  const data = await res.json();

  const pool = args.includeStablecoins ? data : data.filter((t) => !isStablecoin(t));
  const key = SORT_KEYS[args.sort] || SORT_KEYS.market_cap;
  pool.sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity));

  const out = pool.slice(0, Math.max(1, args.limit)).map((t) => ({
    id: t.id,
    name: t.name,
    symbol: (t.symbol || "").toUpperCase(),
    price_usd: t.current_price,
    market_cap_usd: t.market_cap,
    volume_24h_usd: t.total_volume,
    change_24h_pct: round(t.price_change_percentage_24h),
    change_7d_pct: round(t.price_change_percentage_7d_in_currency),
    is_stablecoin: isStablecoin(t),
  }));

  print({
    count: pool.length,
    returned: out.length,
    stablecoins_excluded: !args.includeStablecoins,
    tokens: out,
    source: "CoinGecko (category: mantle-ecosystem)",
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
