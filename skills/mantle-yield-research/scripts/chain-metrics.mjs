#!/usr/bin/env node
/**
 * chain-metrics.mjs — Macro health of the Mantle chain.
 *
 * Usage:  node chain-metrics.mjs
 *
 * Dependency-free. Node >= 18. No API key.
 * Prints JSON: current DeFi TVL, 7d/30d TVL change, TVL rank among chains,
 * and MNT price — the macro backdrop for any pool-level analysis.
 */

const CHAIN_TVL = "https://api.llama.fi/v2/historicalChainTvl/Mantle";
const CHAINS = "https://api.llama.fi/v2/chains";
const MNT_PRICE =
  "https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_24hr_change=true&include_market_cap=true";

async function main() {
  const [tvlR, chainsR, priceR] = await Promise.allSettled([
    fetch(CHAIN_TVL),
    fetch(CHAINS),
    fetch(MNT_PRICE),
  ]);

  let tvlNow = null, c7 = null, c30 = null;
  if (tvlR.status === "fulfilled" && tvlR.value.ok) {
    const s = await tvlR.value.json();
    if (Array.isArray(s) && s.length > 1) {
      const latest = s[s.length - 1].tvl;
      const d7 = s[s.length - 8]?.tvl;
      const d30 = s[s.length - 31]?.tvl;
      tvlNow = Math.round(latest);
      if (d7) c7 = round(((latest - d7) / d7) * 100);
      if (d30) c30 = round(((latest - d30) / d30) * 100);
    }
  }

  let rank = null;
  if (chainsR.status === "fulfilled" && chainsR.value.ok) {
    const chains = await chainsR.value.json();
    const sorted = (chains || []).sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));
    const idx = sorted.findIndex((c) => c.name === "Mantle");
    if (idx >= 0) rank = idx + 1;
  }

  let mnt = null;
  if (priceR.status === "fulfilled" && priceR.value.ok) {
    const j = await priceR.value.json();
    if (j.mantle)
      mnt = {
        usd: j.mantle.usd,
        change_24h_pct: round(j.mantle.usd_24h_change),
        market_cap: j.mantle.usd_market_cap ? Math.round(j.mantle.usd_market_cap) : null,
      };
  }

  print({
    chain: "Mantle",
    chain_id: 5000,
    defi_tvl_usd: tvlNow,
    tvl_change_7d_pct: c7,
    tvl_change_30d_pct: c30,
    tvl_rank_among_chains: rank,
    mnt_price: mnt,
    source:
      "DeFiLlama chain TVL (api.llama.fi/v2/historicalChainTvl/Mantle) + CoinGecko MNT",
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
