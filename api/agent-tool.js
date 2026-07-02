/**
 * Fleepit Agent — server-side tool endpoint.
 *
 * Runs the research tools that must live on a server: the ones backed by an
 * Etherscan API key (wallet token holdings, transaction history). Keeping
 * these here means the key stays secret instead of being shipped to the
 * browser like a VITE_ variable.
 *
 * Contract:  POST { "tool": "<name>", "args": { ... } }  ->  JSON result
 *
 * Supported tools:
 *   get_wallet_tokens       { address }           ERC-20 holdings for an address
 *   get_address_transactions{ address, limit? }   recent transactions for an address
 *
 * Requires env: ETHERSCAN_API_KEY (free at https://etherscan.io/apis).
 * Etherscan's V2 unified API officially covers Mantle Mainnet (chainid 5000).
 * When the key is absent every tool returns a clear needs_key result rather
 * than throwing, so the rest of the app keeps working.
 */

export const config = { maxDuration: 20 };

const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";
const CHAIN_ID = 5000; // Mantle Mainnet

const isAddress = (a) => typeof a === "string" && /^0x[a-fA-F0-9]{40}$/.test(a.trim());

async function etherscan(params, key) {
  const url = new URL(ETHERSCAN_V2);
  url.searchParams.set("chainid", String(CHAIN_ID));
  url.searchParams.set("apikey", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  return res.json();
}

function fmtUnits(raw, decimals) {
  try {
    const d = Number(decimals) || 18;
    const s = BigInt(raw);
    const base = 10n ** BigInt(d);
    const whole = s / base;
    const frac = (s % base).toString().padStart(d, "0").slice(0, 4).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : `${whole}`;
  } catch {
    return "0";
  }
}

function ageFrom(tsSeconds) {
  const diff = Date.now() / 1000 - Number(tsSeconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Tools ───────────────────────────────────────────────────────────────────

async function getWalletTokens(args, key) {
  const address = (args.address || "").trim();
  if (!isAddress(address)) return { error: "Provide a valid Mantle wallet address (0x…40 hex)." };
  if (!key) return { needs_key: true, note: "Wallet token holdings need an Etherscan API key. Add ETHERSCAN_API_KEY to enable this.", source: "Etherscan V2 (Mantle, chainid 5000)" };

  // Derive the set of ERC-20 tokens this address has transacted, from the
  // most recent transfer events, then fetch a live balance for each distinct
  // token (bounded, to respect the free-tier rate limit).
  const tx = await etherscan(
    { module: "account", action: "tokentx", address, page: 1, offset: 100, sort: "desc" },
    key
  );
  if (tx.status !== "1" || !Array.isArray(tx.result)) {
    return { address, tokens: [], note: tx.result || "No ERC-20 transfer history found.", source: "Etherscan V2 (Mantle)" };
  }

  const distinct = new Map();
  for (const t of tx.result) {
    const c = (t.contractAddress || "").toLowerCase();
    if (c && !distinct.has(c)) {
      distinct.set(c, { contract: c, symbol: t.tokenSymbol, name: t.tokenName, decimals: t.tokenDecimal });
    }
    if (distinct.size >= 10) break;
  }

  const tokens = [];
  for (const meta of distinct.values()) {
    try {
      const bal = await etherscan(
        { module: "account", action: "tokenbalance", contractaddress: meta.contract, address, tag: "latest" },
        key
      );
      const amount = bal.status === "1" ? fmtUnits(bal.result, meta.decimals) : null;
      if (amount && amount !== "0") {
        tokens.push({ symbol: meta.symbol, name: meta.name, balance: amount, contract: meta.contract });
      }
    } catch { /* skip a token that fails, keep the rest */ }
  }

  return {
    address,
    count: tokens.length,
    tokens,
    note: tokens.length ? undefined : "No non-zero ERC-20 balances found among this address's recently transacted tokens.",
    source: "Etherscan V2 (Mantle, chainid 5000)",
  };
}

async function getAddressTransactions(args, key) {
  const address = (args.address || "").trim();
  if (!isAddress(address)) return { error: "Provide a valid Mantle wallet address (0x…40 hex)." };
  if (!key) return { needs_key: true, note: "Transaction history needs an Etherscan API key. Add ETHERSCAN_API_KEY to enable this.", source: "Etherscan V2 (Mantle, chainid 5000)" };

  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25);
  const tx = await etherscan(
    { module: "account", action: "txlist", address, page: 1, offset: limit, sort: "desc" },
    key
  );
  if (tx.status !== "1" || !Array.isArray(tx.result)) {
    return { address, count: 0, transactions: [], note: tx.result || "No transactions found.", source: "Etherscan V2 (Mantle)" };
  }

  const transactions = tx.result.slice(0, limit).map((t) => ({
    hash: t.hash,
    from: t.from,
    to: t.to,
    value_mnt: fmtUnits(t.value, 18),
    age: ageFrom(t.timeStamp),
    direction: t.from?.toLowerCase() === address.toLowerCase() ? "out" : "in",
    status: t.isError === "0" ? "success" : "failed",
  }));

  return {
    address,
    count: transactions.length,
    transactions,
    source: "Etherscan V2 (Mantle, chainid 5000)",
  };
}

const TOOLS = {
  get_wallet_tokens: getWalletTokens,
  get_address_transactions: getAddressTransactions,
};

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST { tool, args }." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { tool, args = {} } = body;
    const fn = TOOLS[tool];
    if (!fn) return res.status(400).json({ error: `Unknown tool: ${tool}` });

    const key = process.env.ETHERSCAN_API_KEY || "";
    const result = await fn(args, key);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message || "tool failed" });
  }
}
