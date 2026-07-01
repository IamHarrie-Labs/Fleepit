#!/usr/bin/env node
/**
 * fetch-protocols.mjs — Top DeFi protocols deployed on Mantle, by TVL.
 *
 * Usage:
 *   node fetch-protocols.mjs [--category <name>] [--limit <n>]
 *
 * Dependency-free. Node >= 18 (global fetch). No API key.
 * Prints JSON: { count, returned, protocols[], source }.
 */

const PROTOCOLS_URL = "https://api.llama.fi/protocols";

function parseArgs(argv) {
  const a = { limit: 8 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--category") a.category = argv[++i];
    else if (k === "--limit") a.limit = Number(argv[++i]);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const res = await fetch(PROTOCOLS_URL);
  if (!res.ok) throw new Error(`DeFiLlama request failed: ${res.status}`);
  const all = await res.json();

  let protocols = (all || []).filter((p) => (p.chains || []).some((c) => c.toLowerCase() === "mantle"));
  if (args.category) {
    const cat = args.category.toLowerCase();
    protocols = protocols.filter((p) => (p.category || "").toLowerCase().includes(cat));
  }
  protocols.sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));

  const out = protocols.slice(0, Math.max(1, args.limit)).map((p) => {
    const mantleTvl = p.chainTvls?.Mantle ?? p.tvl ?? 0;
    return {
      name: p.name,
      slug: p.slug,
      category: p.category,
      tvl_mantle_usd: Math.round(mantleTvl),
      tvl_7d_change_pct: round(p.change_7d),
      tvl_30d_change_pct: round(p.change_1m),
      url: p.url,
    };
  });

  print({
    count: protocols.length,
    returned: out.length,
    protocols: out,
    source: "DeFiLlama protocols (api.llama.fi/protocols), chain=Mantle",
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
