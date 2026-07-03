/**
 * Fleepit Analyst — Agent Tools
 * ------------------------------------------------------------------------
 * The FULL Mantle ecosystem research toolkit. Not just pools — tokens,
 * protocols, chain health, price history, everything.
 *
 * Data sources (all public, no key required):
 *   DeFiLlama Yields   https://yields.llama.fi
 *   DeFiLlama TVL      https://api.llama.fi
 *   DeFiLlama Protocols https://api.llama.fi/protocols
 *   CoinGecko          https://api.coingecko.com
 *   Mantle RPC         https://rpc.mantle.xyz  (chain 5000)
 */

const YIELDS_POOLS   = "https://yields.llama.fi/pools";
const YIELDS_CHART   = "https://yields.llama.fi/chart";
const LLAMA_TVL      = "https://api.llama.fi/v2/historicalChainTvl/Mantle";
const LLAMA_CHAINS   = "https://api.llama.fi/v2/chains";
const LLAMA_PROTOCOLS= "https://api.llama.fi/protocols";
const CG_PRICE       = "https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_24hr_change=true&include_market_cap=true";
const CG_MARKETS     = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=mantle-ecosystem&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d";
const CG_COIN_CHART  = "https://api.coingecko.com/api/v3/coins"; // /{id}/market_chart
const MANTLE_RPC     = "https://rpc.mantle.xyz"; // chain id 5000, keyless
const AGENT_API      = "/api/agent-tool";        // server-side tools (Etherscan key)

// ── Mantle RPC (keyless JSON-RPC) ────────────────────────────────────────────
const isAddress = (a) => typeof a === "string" && /^0x[a-fA-F0-9]{40}$/.test(a.trim());

async function rpc(method, params = []) {
  const res = await fetch(MANTLE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result;
}

const hexToNum = (h) => (h == null ? null : parseInt(h, 16));
const weiToMnt = (hex) => {
  try { return Number(BigInt(hex)) / 1e18; } catch { return null; }
};

// Call a server-side tool (Etherscan-backed). In local dev the /api route
// does not exist, so we surface a clear message instead of a raw failure.
async function callAgentApi(tool, args) {
  try {
    const res = await fetch(AGENT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, args }),
    });
    if (!res.ok) {
      if (res.status === 404) return { error: "This lookup runs on the Fleepit backend, which is only available on the deployed site." };
      return { error: `Backend tool failed (${res.status})` };
    }
    return res.json();
  } catch {
    return { error: "This lookup runs on the Fleepit backend, which is only available on the deployed site." };
  }
}

// ── Caches ─────────────────────────────────────────────────────────────────
let _poolsCache = null, _poolsFetchedAt = 0;
let _protocolsCache = null, _protocolsFetchedAt = 0;
const POOLS_TTL     = 5 * 60 * 1000;
const PROTOCOLS_TTL = 5 * 60 * 1000;

async function getMantlePools() {
  if (_poolsCache && Date.now() - _poolsFetchedAt < POOLS_TTL) return _poolsCache;
  const res = await fetch(YIELDS_POOLS);
  if (!res.ok) throw new Error(`DeFiLlama pools failed (${res.status})`);
  const { data = [] } = await res.json();
  _poolsCache = data.filter(p => (p.chain || "").toLowerCase() === "mantle");
  _poolsFetchedAt = Date.now();
  return _poolsCache;
}

async function getMantleProtocols() {
  if (_protocolsCache && Date.now() - _protocolsFetchedAt < PROTOCOLS_TTL) return _protocolsCache;
  const res = await fetch(LLAMA_PROTOCOLS);
  if (!res.ok) throw new Error(`DeFiLlama protocols failed (${res.status})`);
  const data = await res.json();
  _protocolsCache = (data || []).filter(p =>
    (p.chains || []).some(c => c.toLowerCase() === "mantle")
  );
  _protocolsFetchedAt = Date.now();
  return _protocolsCache;
}

// ── Helpers ────────────────────────────────────────────────────────────────
export function classifyRisk(pool) {
  const apy = pool.apy ?? 0;
  if (pool.ilRisk === "yes" || apy > 50) return "high";
  if (apy > 15) return "medium";
  return "low";
}
const RISK_RANK = { low: 0, medium: 1, high: 2 };
function round(n, d = 2) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n * 10 ** d) / 10 ** d;
}
function fmtUsd(n) {
  if (!n) return "$0";
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function slimPool(p, protocolUrls) {
  return {
    id: p.pool, project: p.project, symbol: p.symbol,
    apy: round(p.apy), apyBase: round(p.apyBase), apyReward: round(p.apyReward),
    tvlUsd: Math.round(p.tvlUsd ?? 0), tvlFormatted: fmtUsd(p.tvlUsd),
    stablecoin: !!p.stablecoin, ilRisk: p.ilRisk ?? "unknown",
    rewardTokens: p.rewardTokens ?? [], risk: classifyRisk(p),
    predictedClass: p.predictions?.predictedClass ?? null,
    // The protocol's own site, so a result can link straight to where you'd
    // actually go to act on it — never a fabricated deep link to the exact
    // pool, since DeFiLlama doesn't expose one, just the real protocol entry point.
    url: protocolUrls?.get(p.project) || null,
  };
}
// project slug -> official site, sourced from the same DeFiLlama protocols
// list get_mantle_protocols already uses, so it's one real, live-cached lookup.
async function getProtocolUrlMap() {
  const protocols = await getMantleProtocols();
  return new Map(protocols.map((p) => [p.slug, p.url]).filter(([, url]) => !!url));
}
// Deterministic stablecoin detection — filtering happens in code, not by
// asking the LLM nicely in a prompt, since prompt-only filtering is
// unreliable when the underlying data is majority stablecoins.
const STABLECOIN_SYMBOLS = new Set([
  "usdt", "usdc", "dai", "busd", "usd1", "usde", "usdt0", "usdy", "susde",
  "tusd", "fdusd", "usdd", "gusd", "usdp", "lusd", "frax", "gho", "usds",
  "pyusd", "usda", "usdx", "usr", "usde0",
]);
export function isStablecoin(t) {
  const sym = (t.symbol || "").toLowerCase();
  if (STABLECOIN_SYMBOLS.has(sym)) return true;
  const nearDollar = t.current_price >= 0.97 && t.current_price <= 1.03;
  const looksStable = /usd/i.test(t.symbol || "") || /usd/i.test(t.name || "");
  return nearDollar && looksStable;
}

export function findPools(pools, q) {
  const term = (q || "").toLowerCase().trim();
  if (!term) return [];
  return pools
    .map(p => {
      const sym = (p.symbol || "").toLowerCase();
      const proj = (p.project || "").toLowerCase();
      let s = 0;
      if (sym === term || proj === term) s = 100;
      else if (sym.includes(term) || proj.includes(term)) s = 60;
      else if (term.split(/[\s/-]+/).some(t => t && (sym.includes(t) || proj.includes(t)))) s = 30;
      return { p, s };
    })
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.p.tvlUsd ?? 0) - (a.p.tvlUsd ?? 0))
    .map(x => x.p);
}

// ════════════════════════════════════════════════════════════════════════════
// TOOL SCHEMAS
// ════════════════════════════════════════════════════════════════════════════
export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "get_mantle_tokens",
      description:
        "Get top tokens in the Mantle ecosystem by market cap, price, 24h/7d performance, and trading volume. Use for: 'top tokens on Mantle', 'best performing tokens', 'which tokens are up/down', 'compare token prices'. Returns live data from CoinGecko. By default this EXCLUDES dollar-pegged stablecoins (USDT, USDC, USD1, USDe, USDY, sUSDe, etc.) because they do not appreciate and are not growth/investment assets — only set include_stablecoins to true if the user explicitly asks about stablecoins, dollar-pegged assets, or parking cash.",
      parameters: {
        type: "object",
        properties: {
          sort_by: {
            type: "string",
            enum: ["market_cap", "price_change_24h", "price_change_7d", "volume"],
            description: "Sort order. Default: market_cap.",
          },
          limit: { type: "number", description: "How many to return (default 8, max 20)." },
          include_stablecoins: {
            type: "boolean",
            description: "Set true ONLY if the user explicitly asked about stablecoins or dollar-pegged assets. Default false (excluded).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_price_history",
      description:
        "Get price history chart data for a specific token over 7, 14, or 30 days. Use when asked about a token's price trend, whether it's a good time to buy, historical highs/lows, or to power a comparison chart. Provide the CoinGecko token id (e.g. 'mantle', 'wrapped-mantle', 'meth').",
      parameters: {
        type: "object",
        properties: {
          token_id: { type: "string", description: "CoinGecko token id (lowercase, hyphenated)." },
          days: { type: "number", description: "Days of history: 7, 14, or 30. Default 14." },
        },
        required: ["token_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mantle_protocols",
      description:
        "Get top DeFi protocols deployed on Mantle, ranked by TVL. Use for: 'top protocols on Mantle', 'biggest DeFi projects on Mantle', 'where is the most liquidity', 'compare Aave vs Merchant Moe'. Returns TVL, 7d/30d change, and category.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by protocol type, e.g. 'Lending', 'DEXes', 'Yield', 'RWA'. Omit for all.",
          },
          limit: { type: "number", description: "How many to return (default 8, max 20)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mantle_chain_metrics",
      description:
        "Macro health of the Mantle chain: total DeFi TVL, 7d/30d TVL change, rank among chains, and MNT token price. Use as context for any investment or ecosystem question.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_mantle_pools",
      description:
        "List live yield/staking pools on Mantle, sorted and filtered. Use specifically for yield farming, staking, or liquidity provision questions. Returns APY breakdown, TVL, risk class.",
      parameters: {
        type: "object",
        properties: {
          sort_by: { type: "string", enum: ["apy", "tvl"], description: "Default apy." },
          max_risk: { type: "string", enum: ["low", "medium", "high"] },
          stablecoin_only: { type: "boolean" },
          min_tvl_usd: { type: "number" },
          limit: { type: "number", description: "Default 8, max 25." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pool_details",
      description:
        "Look up specific yield pools on Mantle by name, symbol, or protocol. Use when the user names a specific protocol or token pair in a yield context.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Pool symbol, token, or protocol name." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pool_history",
      description:
        "30-day APY and TVL history for a specific pool. Use to judge yield sustainability, catch the 'rising APY + falling TVL' trap, or show trend. Provide the DeFiLlama pool uuid.",
      parameters: {
        type: "object",
        properties: {
          pool_id: { type: "string", description: "DeFiLlama pool uuid." },
        },
        required: ["pool_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_assets",
      description:
        "Side-by-side comparison of tokens or pools. Use when asked to compare 2-5 specific assets. Pass names/symbols; the tool will resolve and align them.",
      parameters: {
        type: "object",
        properties: {
          queries: {
            type: "array",
            items: { type: "string" },
            description: "Asset names, symbols, or pool ids to compare (2-5 items).",
          },
          type: {
            type: "string",
            enum: ["auto", "tokens", "pools"],
            description: "Force token or pool lookup. 'auto' tries tokens first, falls back to pools.",
          },
        },
        required: ["queries"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_gas_network",
      description:
        "Current Mantle network status: live gas price (gwei) and latest block number, read directly from the Mantle RPC. Use for 'what is gas on Mantle right now', 'how busy is Mantle', 'current block'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_wallet_overview",
      description:
        "Look up any Mantle address: native MNT balance, transaction count, and whether it is a normal wallet or a smart contract. Read directly from the Mantle RPC. Use when the user pastes a 0x… address and asks what it is or what it holds.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "A Mantle address (0x followed by 40 hex characters)." },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_wallet_tokens",
      description:
        "List the ERC-20 token holdings of a Mantle address (symbol, name, live balance). Use when asked which tokens a wallet holds. Runs on the Fleepit backend via Etherscan.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "A Mantle address (0x…40 hex)." },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_address_transactions",
      description:
        "Recent transaction history for a Mantle address (hash, direction, value, age, success/failure). Use when asked about an address's activity or recent transactions. Runs on the Fleepit backend via Etherscan.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "A Mantle address (0x…40 hex)." },
          limit: { type: "number", description: "How many recent transactions (default 10, max 25)." },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mantle_news",
      description:
        "Latest news headlines about the Mantle ecosystem (launches, listings, partnerships, ecosystem reports), newest first. Use for: 'any news on Mantle', 'what's happening', 'latest updates', 'recent announcements'. Each article has title, source, link, and age.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "How many headlines (default 8, max 15)." },
        },
      },
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTORS
// ════════════════════════════════════════════════════════════════════════════
export const toolExecutors = {

  async get_mantle_tokens(args = {}) {
    const res = await fetch(CG_MARKETS);
    if (!res.ok) throw new Error(`CoinGecko tokens failed (${res.status})`);
    const data = await res.json();
    const limit = Math.min(args.limit ?? 8, 20);

    const pool = args.include_stablecoins ? data : data.filter(t => !isStablecoin(t));

    const sortKey = {
      price_change_24h: "price_change_percentage_24h",
      price_change_7d: "price_change_percentage_7d_in_currency",
      volume: "total_volume",
      market_cap: "market_cap",
    }[args.sort_by || "market_cap"] || "market_cap";

    const sorted = [...pool].sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity));

    return {
      count: sorted.length,
      returned: Math.min(limit, sorted.length),
      sort_by: args.sort_by || "market_cap",
      stablecoins_excluded: !args.include_stablecoins,
      tokens: sorted.slice(0, limit).map(t => ({
        id: t.id,
        name: t.name,
        symbol: (t.symbol || "").toUpperCase(),
        price_usd: t.current_price,
        market_cap_usd: t.market_cap,
        market_cap_formatted: fmtUsd(t.market_cap),
        volume_24h_usd: t.total_volume,
        volume_formatted: fmtUsd(t.total_volume),
        change_24h_pct: round(t.price_change_percentage_24h),
        change_7d_pct: round(t.price_change_percentage_7d_in_currency),
        ath_usd: t.ath,
        ath_change_pct: round(t.ath_change_percentage),
        is_stablecoin: isStablecoin(t),
      })),
      source: "CoinGecko (category: mantle-ecosystem)",
    };
  },

  async get_token_price_history(args = {}) {
    const id = args.token_id;
    const days = [7, 14, 30].includes(Number(args.days)) ? Number(args.days) : 14;
    if (!id) return { error: "token_id is required" };

    const res = await fetch(`${CG_COIN_CHART}/${id}/market_chart?vs_currency=usd&days=${days}`);
    if (!res.ok) return { error: `CoinGecko chart failed for ${id} (${res.status}). Try get_mantle_tokens to confirm the id.` };
    const { prices = [] } = await res.json();
    if (!prices.length) return { token_id: id, note: "No price data returned." };

    const pts = prices.map(([ts, p]) => ({ date: new Date(ts).toISOString().slice(0,10), price: round(p, 4) }));
    const vals = pts.map(p => p.price);
    const first = vals[0], last = vals[vals.length - 1];
    const high = Math.max(...vals), low = Math.min(...vals);
    const changePct = first > 0 ? round(((last - first) / first) * 100) : null;

    return {
      token_id: id,
      days,
      price_now: last,
      price_start: first,
      change_pct: changePct,
      high, low,
      trend: changePct > 5 ? "uptrend" : changePct < -5 ? "downtrend" : "sideways",
      // Downsample to ~15 points for sparkline rendering
      sparkline: pts.filter((_, i, a) => i === 0 || i === a.length - 1 || i % Math.max(1, Math.floor(a.length / 13)) === 0).map(p => p.price),
      source: `CoinGecko (${id}, ${days}d market chart)`,
    };
  },

  async get_mantle_protocols(args = {}) {
    const protocols = await getMantleProtocols();
    let out = [...protocols];
    if (args.category) {
      const cat = args.category.toLowerCase();
      out = out.filter(p => (p.category || "").toLowerCase().includes(cat));
    }
    out.sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));
    const limit = Math.min(args.limit ?? 8, 20);
    return {
      count: out.length,
      returned: Math.min(limit, out.length),
      protocols: out.slice(0, limit).map(p => {
        const mantleTvl = p.chainTvls?.Mantle ?? p.tvl ?? 0;
        return {
          name: p.name,
          slug: p.slug,
          category: p.category,
          tvl_mantle_usd: Math.round(mantleTvl),
          tvl_formatted: fmtUsd(mantleTvl),
          tvl_7d_change_pct: round(p.change_7d),
          tvl_30d_change_pct: round(p.change_1m),
          url: p.url,
        };
      }),
      source: "DeFiLlama protocols (api.llama.fi/protocols), chain=Mantle",
    };
  },

  async get_mantle_chain_metrics() {
    const [tvlR, priceR, chainsR] = await Promise.allSettled([
      fetch(LLAMA_TVL), fetch(CG_PRICE), fetch(LLAMA_CHAINS),
    ]);

    let tvlNow = null, c7 = null, c30 = null;
    if (tvlR.status === "fulfilled" && tvlR.value.ok) {
      const s = await tvlR.value.json();
      if (Array.isArray(s) && s.length > 1) {
        const latest = s[s.length - 1].tvl;
        const d7 = s[s.length - 8]?.tvl, d30 = s[s.length - 31]?.tvl;
        tvlNow = Math.round(latest);
        if (d7)  c7  = round(((latest - d7)  / d7)  * 100);
        if (d30) c30 = round(((latest - d30) / d30) * 100);
      }
    }

    let mnt = null;
    if (priceR.status === "fulfilled" && priceR.value.ok) {
      const j = await priceR.value.json();
      if (j.mantle) mnt = {
        usd: j.mantle.usd,
        change_24h_pct: round(j.mantle.usd_24h_change),
        market_cap: j.mantle.usd_market_cap ? Math.round(j.mantle.usd_market_cap) : null,
        market_cap_formatted: fmtUsd(j.mantle.usd_market_cap),
      };
    }

    let tvlRank = null;
    if (chainsR.status === "fulfilled" && chainsR.value.ok) {
      const chains = await chainsR.value.json();
      const sorted = (chains || []).sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0));
      const idx = sorted.findIndex(c => c.name === "Mantle");
      if (idx >= 0) tvlRank = idx + 1;
    }

    return {
      chain: "Mantle", chain_id: 5000,
      defi_tvl_usd: tvlNow, defi_tvl_formatted: fmtUsd(tvlNow),
      tvl_change_7d_pct: c7, tvl_change_30d_pct: c30,
      tvl_rank_among_chains: tvlRank,
      mnt_price: mnt,
      source: "DeFiLlama chain TVL + CoinGecko MNT",
    };
  },

  async list_mantle_pools(args = {}) {
    const [pools, protocolUrls] = await Promise.all([getMantlePools(), getProtocolUrlMap()]);
    let out = [...pools];
    if (args.stablecoin_only) out = out.filter(p => p.stablecoin);
    if (args.max_risk) {
      const cap = RISK_RANK[args.max_risk] ?? 2;
      out = out.filter(p => RISK_RANK[classifyRisk(p)] <= cap);
    }
    if (typeof args.min_tvl_usd === "number")
      out = out.filter(p => (p.tvlUsd ?? 0) >= args.min_tvl_usd);
    const key = args.sort_by === "tvl" ? "tvlUsd" : "apy";
    out.sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
    const limit = Math.min(args.limit ?? 8, 25);
    return {
      count: out.length, returned: Math.min(limit, out.length),
      pools: out.slice(0, limit).map((p) => slimPool(p, protocolUrls)),
      source: "DeFiLlama Yields (yields.llama.fi/pools), chain=Mantle",
    };
  },

  async get_pool_details(args = {}) {
    const [pools, protocolUrls] = await Promise.all([getMantlePools(), getProtocolUrlMap()]);
    const matches = findPools(pools, args.query).slice(0, 5);
    return {
      query: args.query,
      matches: matches.length ? matches.map((p) => slimPool(p, protocolUrls)) : [],
      note: matches.length ? undefined : "No match found. Try list_mantle_pools to browse available pools.",
      source: "DeFiLlama Yields (yields.llama.fi/pools)",
    };
  },

  async get_pool_history(args = {}) {
    const id = args.pool_id;
    if (!id) return { error: "pool_id required" };
    const res = await fetch(`${YIELDS_CHART}/${id}`);
    if (!res.ok) return { error: `History unavailable (${res.status})` };
    const { data = [] } = await res.json();
    const series = data.filter(d => d.apy != null);
    if (!series.length) return { pool_id: id, note: "No history data." };
    const w = series.slice(-30);
    const apys = w.map(d => d.apy);
    const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
    const mu = avg(apys);
    const cov = mu > 0 ? Math.sqrt(avg(apys.map(x => (x - mu) ** 2))) / mu : 0;
    const first = w[0], last = w[w.length - 1];
    return {
      pool_id: id, window_days: w.length,
      apy: {
        current: round(last.apy), avg_30d: round(mu),
        min_30d: round(Math.min(...apys)), max_30d: round(Math.max(...apys)),
        stability: cov < 0.15 ? "stable" : cov < 0.4 ? "moderate" : "volatile",
        volatility_cov: round(cov, 3),
      },
      tvl: {
        current: Math.round(last.tvlUsd ?? 0),
        start: Math.round(first.tvlUsd ?? 0),
        change_pct: first.tvlUsd > 0 ? round(((last.tvlUsd - first.tvlUsd) / first.tvlUsd) * 100) : null,
        direction: (last.tvlUsd ?? 0) >= (first.tvlUsd ?? 0) ? "inflow" : "outflow",
      },
      sparkline: w.filter((_, i, a) => i === 0 || i === a.length - 1 || i % 3 === 0).map(d => round(d.apy)),
      source: `DeFiLlama Yields chart (yields.llama.fi/chart/${id})`,
    };
  },

  async compare_assets(args = {}) {
    const queries = (args.queries || []).slice(0, 5);
    const type = args.type || "auto";

    // Try tokens first if type is auto or tokens
    let tokenRows = [], poolRows = [];

    if (type !== "pools") {
      try {
        const res = await fetch(CG_MARKETS);
        if (res.ok) {
          const tkns = await res.json();
          for (const q of queries) {
            const ql = q.toLowerCase();
            const t = tkns.find(x => x.id === ql || x.symbol?.toLowerCase() === ql || x.name?.toLowerCase() === ql);
            if (t) tokenRows.push({
              name: t.name, symbol: (t.symbol || "").toUpperCase(),
              price_usd: t.current_price,
              market_cap_formatted: fmtUsd(t.market_cap),
              change_24h_pct: round(t.price_change_percentage_24h),
              change_7d_pct: round(t.price_change_percentage_7d_in_currency),
            });
          }
        }
      } catch { /* fall through */ }
    }

    if (type !== "tokens" && tokenRows.length < queries.length) {
      const [pools, protocolUrls] = await Promise.all([getMantlePools(), getProtocolUrlMap()]);
      const missing = queries.filter(q => !tokenRows.some(t => t.symbol?.toLowerCase() === q.toLowerCase()));
      for (const q of missing) {
        const p = pools.find(x => x.pool === q) || findPools(pools, q)[0];
        if (p) poolRows.push(slimPool(p, protocolUrls));
      }
    }

    return {
      compared: tokenRows.length + poolRows.length,
      tokens: tokenRows.length ? tokenRows : undefined,
      pools: poolRows.length ? poolRows : undefined,
      source: "CoinGecko (mantle-ecosystem) + DeFiLlama Yields",
    };
  },

  // ── On-chain tools (Mantle RPC, keyless) ──────────────────────────────────
  async get_gas_network() {
    const [gasHex, blockHex] = await Promise.all([
      rpc("eth_gasPrice"),
      rpc("eth_blockNumber"),
    ]);
    const gwei = gasHex ? Number(BigInt(gasHex)) / 1e9 : null;
    return {
      gas_price_gwei: gwei != null ? round(gwei, 3) : null,
      gas_price_wei: gasHex ? BigInt(gasHex).toString() : null,
      latest_block: hexToNum(blockHex),
      source: "Mantle RPC (rpc.mantle.xyz, chain 5000)",
    };
  },

  async get_wallet_overview(args = {}) {
    const address = (args.address || "").trim();
    if (!isAddress(address)) return { error: "Provide a valid Mantle address (0x followed by 40 hex characters)." };
    const [balHex, nonceHex, code] = await Promise.all([
      rpc("eth_getBalance", [address, "latest"]),
      rpc("eth_getTransactionCount", [address, "latest"]),
      rpc("eth_getCode", [address, "latest"]),
    ]);
    const mnt = weiToMnt(balHex);
    const isContract = code && code !== "0x";
    return {
      address,
      type: isContract ? "contract" : "wallet",
      mnt_balance: mnt != null ? round(mnt, 4) : null,
      mnt_balance_formatted: mnt != null ? `${round(mnt, 4)} MNT` : "N/A",
      tx_count: hexToNum(nonceHex),
      source: "Mantle RPC (rpc.mantle.xyz, chain 5000)",
    };
  },

  // ── Server-backed tools (Etherscan key stays on the server) ───────────────
  async get_wallet_tokens(args = {}) {
    return callAgentApi("get_wallet_tokens", { address: (args.address || "").trim() });
  },

  async get_address_transactions(args = {}) {
    return callAgentApi("get_address_transactions", {
      address: (args.address || "").trim(),
      limit: args.limit,
    });
  },

  async get_mantle_news(args = {}) {
    return callAgentApi("get_mantle_news", { limit: args.limit });
  },
};

export { getMantlePools, fmtUsd };
