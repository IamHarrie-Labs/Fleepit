import { useState, useEffect, useRef, useCallback } from "react";
import { runResearchAgent } from "../lib/researchAgent";
import { toolExecutors, fmtUsd } from "../lib/agentTools";
import { GROQ_API_KEY } from "../config";
import AppNav from "../components/layout/AppNav";

// ── Palette (from Fleepit.dc.html) ──────────────────────────────────────────
const BLACK = "#0A0A0A";
const GREEN = "#0D9E6E";
const RED = "#DC3545";
const GRAY = "#9B9B9B";
const LGRAY = "#BBBBBB";

function cleanAnalysis(text) {
  if (!text) return text;
  return text
    // Bold / italic / stray asterisks of any form
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/[*_]{1,3}/g, "")
    // Markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Bullet / numbered list markers, so lines read as prose
    .replace(/^[ \t]*[-•]\s+/gm, "")
    .replace(/^[ \t]*\d+[.)]\s+/gm, "")
    // Inline source citations (shown separately as chips already)
    .replace(/\[(DeFiLlama|CoinGecko|Mantle RPC)[^\]]*\]/g, "")
    // Emoji
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    // Cleanup stray whitespace left behind
    .replace(/[ \t]+([.,])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const fmtPct = (n) => (n === null || n === undefined || Number.isNaN(n) ? "N/A" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);
const pctColor = (n) => (n === null || n === undefined || Number.isNaN(n) ? GRAY : n >= 0 ? GREEN : RED);
const fmtPrice = (p) => p === undefined || p === null ? "N/A" : p < 0.001 ? `$${p.toFixed(6)}` : p < 1 ? `$${p.toFixed(4)}` : p < 10000 ? `$${p.toFixed(2)}` : `$${p.toLocaleString("en", { maximumFractionDigits: 0 })}`;

// ── Icons ────────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
      <circle cx="6.5" cy="6.5" r="5.25" stroke={BLACK} strokeWidth="1.5" />
      <path d="M10.5 10.5L13.5 13.5" stroke={BLACK} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function MicIcon({ color }) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" style={{ color, display: "block" }}>
      <rect x="4.5" y="0.75" width="5" height="8.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 7.5C1.5 10.538 4.186 13 7.5 13C10.814 13 13.5 10.538 13.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7.5" y1="13" x2="7.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
// Top-level (stable) component — must live outside FleepitApp's render body,
// otherwise React treats it as a brand-new component type on every keystroke
// and remounts the <input>, dropping focus after each character.
function SearchBox({ placeholder, value, onChange, onSubmit, voiceSupported, listening, onToggleVoice, voiceIconColor, disabled }) {
  return (
    <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 18, padding: "5px 5px 5px 20px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <SearchIcon />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onSubmit(); }}
        placeholder={placeholder}
        style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontWeight: 400, color: BLACK, outline: "none", padding: "14px 0", minWidth: 0, fontFamily: "inherit" }}
      />
      {voiceSupported && (
        <button onClick={onToggleVoice} style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: listening ? BLACK : "#F0F0F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }} title="Voice input">
          <MicIcon color={voiceIconColor} />
        </button>
      )}
      <button onClick={onSubmit} disabled={disabled} className="fleepit-research-btn" style={{ background: BLACK, color: "white", border: "none", borderRadius: 12, padding: "11px 22px", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", letterSpacing: "-0.01em", opacity: disabled ? 0.5 : 1 }}>
        Research
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5L4.2 7.5L8.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M8 2L4 6L8 10" stroke={BLACK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="rgba(255,255,255,0.65)" />
    </svg>
  );
}

// ── Charts (ported from Fleepit.dc.html makeBarChart / makeLineChart) ──────
function BarChart({ data }) {
  if (!data?.labels?.length) return null;
  const { labels, values, colors } = data;
  const W = 800, H = 156, n = labels.length;
  const bw = Math.max(Math.floor((W - 40) / n) - 10, 12);
  const hasNeg = values.some((v) => v < 0);
  const maxAbs = Math.max(...values.map(Math.abs), 0.001);
  const baseline = hasNeg ? H - (Math.max(...values) / maxAbs) * ((H - 32) / 2) - 16 : H - 16;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ display: "block", width: "100%", maxHeight: 190 }}>
        {hasNeg && <line x1={20} y1={baseline} x2={W - 20} y2={baseline} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />}
        {labels.map((lbl, i) => {
          const v = values[i];
          const bh = Math.max((Math.abs(v) / maxAbs) * (H - 32), 2);
          const x = 20 + i * ((W - 40) / n) + 5;
          const fill = colors[i] || (v >= 0 ? BLACK : RED);
          const barY = hasNeg ? (v >= 0 ? baseline - bh : baseline) : H - 16 - bh;
          return (
            <g key={i}>
              <rect x={x} y={barY} width={bw} height={bh} rx={3} fill={fill} opacity={0.85} />
              <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize={10} fill={GRAY} fontFamily="'DM Sans',system-ui">
                {lbl.length > 7 ? lbl.slice(0, 6) + "…" : lbl}
              </text>
              <text x={x + bw / 2} y={barY - 5} textAnchor="middle" fontSize={9} fill={fill} fontFamily="'DM Sans',system-ui">
                {Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) < 10 ? v.toFixed(1) : Math.round(v).toString()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart({ data }) {
  if (!data?.values || data.values.length < 2) return null;
  const { values } = data;
  const W = 800, H = 130;
  const minV = Math.min(...values), maxV = Math.max(...values), range = maxV - minV || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (W - 24) + 12, H - ((v - minV) / range) * (H - 28) - 14]);
  const lineD = "M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
  const fillD = lineD + ` L ${pts[pts.length - 1][0]},${H} L ${pts[0][0]},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", maxHeight: 150 }}>
      <defs>
        <linearGradient id="fleepitLg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLACK} stopOpacity={0.09} />
          <stop offset="100%" stopColor={BLACK} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#fleepitLg)" />
      <path d={lineD} fill="none" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Result formatting — builds design-shaped view model from real agent data ─
function cell(v, weight, color, href) {
  return { v: v === null || v === undefined ? "N/A" : String(v), weight: weight || "400", color: color || BLACK, href };
}

function formatResults(stepResults, question) {
  const byName = (n) => stepResults.filter((r) => r.name === n).map((r) => r.result);

  const tokens = byName("get_mantle_tokens")[0];
  const protocols = byName("get_mantle_protocols")[0];
  const pools = byName("list_mantle_pools")[0];
  const compare = byName("compare_assets")[0];
  const chain = byName("get_mantle_chain_metrics")[0];
  const tokenHist = byName("get_token_price_history")[0];
  const poolHist = byName("get_pool_history")[0];
  const gas = byName("get_gas_network")[0];
  const wallet = byName("get_wallet_overview")[0];
  const walletTokens = byName("get_wallet_tokens")[0];
  const addrTx = byName("get_address_transactions")[0];
  const news = byName("get_mantle_news")[0];

  const shortAddr = (a) => (a && a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

  let title = "Research Results", meta = `Research on: "${question}"`;
  let summaryCards = [], tableHeaders = [], tableRows = [], tableGridCols = "", chartData = null;

  if (news?.articles?.length) {
    title = "Mantle in the News";
    meta = `${news.count} recent headlines, newest first`;
    tableHeaders = ["Headline", "Source", "Age"];
    tableGridCols = "4fr 1.2fr 0.8fr";
    tableRows = news.articles.map((a) => [
      cell(a.title, "500", BLACK, a.link),
      cell(a.source, "400", GRAY),
      cell(a.age, "400", GRAY),
    ]);
  } else if (wallet || walletTokens || addrTx) {
    // On-chain address view — prefer overview, layer in tokens/transactions.
    const addr = wallet?.address || walletTokens?.address || addrTx?.address;
    title = "Address Overview";
    meta = `Mantle address ${shortAddr(addr)}, live on-chain`;

    if (wallet) {
      summaryCards = [
        { label: "TYPE", value: wallet.type === "contract" ? "Contract" : "Wallet", bg: "#F8F8F8", valueColor: BLACK },
        { label: "MNT BALANCE", value: wallet.mnt_balance_formatted, bg: "#F8F8F8", valueColor: BLACK },
        { label: "TRANSACTIONS", value: wallet.tx_count != null ? `${wallet.tx_count}` : "N/A", bg: "#F8F8F8", valueColor: BLACK },
      ];
    }

    if (walletTokens && !walletTokens.needs_key && walletTokens.tokens?.length) {
      tableHeaders = ["Token", "Name", "Balance"];
      tableGridCols = "1.2fr 2fr 1.6fr";
      tableRows = walletTokens.tokens.map((t) => [
        cell(t.symbol, "600", BLACK),
        cell(t.name, "400", GRAY),
        cell(t.balance, "500", BLACK),
      ]);
    } else if (addrTx && !addrTx.needs_key && addrTx.transactions?.length) {
      tableHeaders = ["Hash", "Direction", "Value (MNT)", "Age", "Status"];
      tableGridCols = "2fr 1fr 1.3fr 1fr 1fr";
      tableRows = addrTx.transactions.map((t) => [
        cell(shortAddr(t.hash), "500", BLACK),
        cell(t.direction === "out" ? "Out" : "In", "500", t.direction === "out" ? RED : GREEN),
        cell(t.value_mnt, "400", BLACK),
        cell(t.age, "400", GRAY),
        cell(t.status, "500", t.status === "success" ? GREEN : RED),
      ]);
    }
  } else if (gas) {
    title = "Mantle Network Status";
    meta = "Live from the Mantle RPC";
    summaryCards = [
      { label: "GAS PRICE", value: gas.gas_price_gwei != null ? `${gas.gas_price_gwei} gwei` : "N/A", bg: "#F0FDF4", valueColor: GREEN },
      { label: "LATEST BLOCK", value: gas.latest_block != null ? gas.latest_block.toLocaleString() : "N/A", bg: "#F8F8F8", valueColor: BLACK },
      { label: "CHAIN", value: "Mantle (5000)", bg: "#F8F8F8", valueColor: BLACK },
    ];
  } else if (tokens) {
    title = "Top Tokens on Mantle";
    meta = `${tokens.returned} tokens from the Mantle ecosystem, live via CoinGecko`;
    tableHeaders = ["Token", "Price", "24h Change", "Market Cap", "Volume"];
    tableGridCols = "1.2fr 1.3fr 1.3fr 1.5fr 1.5fr";
    tableRows = tokens.tokens.map((t) => [
      cell(t.symbol, "600", BLACK),
      cell(fmtPrice(t.price_usd), "400", BLACK),
      cell(fmtPct(t.change_24h_pct), "600", pctColor(t.change_24h_pct)),
      cell(t.market_cap_formatted, "500", BLACK),
      cell(t.volume_formatted, "400", GRAY),
    ]);
    const gainer = [...tokens.tokens].sort((a, b) => (b.change_24h_pct || 0) - (a.change_24h_pct || 0))[0];
    summaryCards = [
      { label: "TOKENS TRACKED", value: `${tokens.returned}`, bg: "#F8F8F8", valueColor: BLACK },
      { label: "COMBINED CAP", value: fmtUsd(tokens.tokens.reduce((s, t) => s + (t.market_cap_usd || 0), 0)), bg: "#F8F8F8", valueColor: BLACK },
      gainer ? { label: "TOP GAINER", value: gainer.symbol, sub: fmtPct(gainer.change_24h_pct), bg: "#F0FDF4", valueColor: GREEN, subColor: GREEN } : null,
    ].filter(Boolean);
    const chartable = tokens.tokens.slice(0, 8);
    chartData = { labels: chartable.map((t) => t.symbol), values: chartable.map((t) => t.change_24h_pct || 0), colors: chartable.map((t) => (t.change_24h_pct || 0) >= 0 ? BLACK : RED) };
  } else if (pools) {
    title = "Yield Pools on Mantle";
    meta = `${pools.returned} of ${pools.count} Mantle pools, live via DeFiLlama`;
    tableHeaders = ["Pool", "Protocol", "APY", "TVL", "Risk"];
    tableGridCols = "1.8fr 1.5fr 1fr 1.3fr 1fr";
    tableRows = pools.pools.map((p) => [
      cell(p.symbol, "600", BLACK),
      cell(p.project, "400", GRAY),
      cell(`${(p.apy || 0).toFixed(2)}%`, "600", GREEN),
      cell(p.tvlFormatted, "500", BLACK),
      cell(p.risk === "low" ? "Low" : p.risk === "medium" ? "Medium" : "High", "500", p.risk === "low" ? GREEN : p.risk === "medium" ? "#F59E0B" : RED),
    ]);
    const avgApy = pools.pools.reduce((s, p) => s + (p.apy || 0), 0) / Math.max(pools.pools.length, 1);
    summaryCards = [
      { label: "TOP APY", value: `${(pools.pools[0]?.apy || 0).toFixed(1)}%`, sub: pools.pools[0]?.symbol, bg: "#F0FDF4", valueColor: GREEN, subColor: GREEN },
      { label: "AVERAGE APY", value: `${avgApy.toFixed(1)}%`, bg: "#F8F8F8", valueColor: BLACK },
      { label: "COMBINED TVL", value: fmtUsd(pools.pools.reduce((s, p) => s + (p.tvlUsd || 0), 0)), bg: "#F8F8F8", valueColor: BLACK },
    ];
    const chartable = pools.pools.slice(0, 8);
    chartData = { labels: chartable.map((p) => p.symbol.split("-")[0]), values: chartable.map((p) => p.apy || 0), colors: chartable.map(() => BLACK) };
  } else if (protocols) {
    title = "Mantle Ecosystem Protocols";
    meta = `${protocols.returned} of ${protocols.count} protocols, ranked by TVL`;
    tableHeaders = ["Protocol", "Category", "TVL", "7d Change", "30d Change"];
    tableGridCols = "2fr 1.3fr 1.3fr 1.2fr 1.2fr";
    tableRows = protocols.protocols.map((p) => [
      cell(p.name, "600", BLACK),
      cell(p.category || "DeFi", "400", GRAY),
      cell(p.tvl_formatted, "500", BLACK),
      cell(fmtPct(p.tvl_7d_change_pct), "500", pctColor(p.tvl_7d_change_pct)),
      cell(fmtPct(p.tvl_30d_change_pct), "500", pctColor(p.tvl_30d_change_pct)),
    ]);
    summaryCards = [
      { label: "TOTAL PROTOCOLS", value: `${protocols.count}`, bg: "#F8F8F8", valueColor: BLACK },
      { label: "COMBINED TVL", value: fmtUsd(protocols.protocols.reduce((s, p) => s + (p.tvl_mantle_usd || 0), 0)), bg: "#F8F8F8", valueColor: BLACK },
      { label: "TOP PROTOCOL", value: protocols.protocols[0]?.name || "N/A", sub: protocols.protocols[0]?.tvl_formatted, bg: "#F8F8F8", valueColor: BLACK, subColor: GRAY },
    ];
    const chartable = protocols.protocols.slice(0, 8);
    chartData = { labels: chartable.map((p) => (p.name.length > 9 ? p.name.slice(0, 8) + "." : p.name)), values: chartable.map((p) => (p.tvl_mantle_usd || 0) / 1e6), colors: chartable.map(() => BLACK) };
  } else if (compare) {
    title = "Comparison";
    meta = `${compare.compared} assets compared, live data`;
    if (compare.tokens?.length) {
      tableHeaders = ["Token", "Price", "24h", "7d", "Market Cap"];
      tableGridCols = "1.3fr 1.3fr 1.1fr 1.1fr 1.5fr";
      tableRows = compare.tokens.map((t) => [
        cell(t.symbol, "600", BLACK), cell(fmtPrice(t.price_usd), "400", BLACK),
        cell(fmtPct(t.change_24h_pct), "600", pctColor(t.change_24h_pct)),
        cell(fmtPct(t.change_7d_pct), "500", pctColor(t.change_7d_pct)),
        cell(t.market_cap_formatted, "500", GRAY),
      ]);
    } else if (compare.pools?.length) {
      tableHeaders = ["Pool", "Protocol", "APY", "TVL", "Risk"];
      tableGridCols = "1.8fr 1.5fr 1fr 1.3fr 1fr";
      tableRows = compare.pools.map((p) => [
        cell(p.symbol, "600", BLACK), cell(p.project, "400", GRAY),
        cell(`${(p.apy || 0).toFixed(2)}%`, "600", GREEN), cell(p.tvlFormatted, "500", BLACK),
        cell(p.risk, "500", p.risk === "low" ? GREEN : p.risk === "medium" ? "#F59E0B" : RED),
      ]);
    }
    summaryCards = [{ label: "ASSETS COMPARED", value: `${compare.compared}`, bg: "#F8F8F8", valueColor: BLACK }];
  } else if (chain) {
    title = "Mantle Chain Health";
    meta = "Live chain metrics from DeFiLlama and CoinGecko";
    tableHeaders = ["Metric", "Value", "Period"];
    tableGridCols = "3fr 2fr 2fr";
    tableRows = [
      [cell("Total Value Locked", "500", BLACK), cell(chain.defi_tvl_formatted, "600", BLACK), cell("Current", "400", GRAY)],
      [cell("TVL Change", "500", BLACK), cell(fmtPct(chain.tvl_change_7d_pct), "600", pctColor(chain.tvl_change_7d_pct)), cell("7 days", "400", GRAY)],
      [cell("TVL Change", "500", BLACK), cell(fmtPct(chain.tvl_change_30d_pct), "600", pctColor(chain.tvl_change_30d_pct)), cell("30 days", "400", GRAY)],
      [cell("MNT Price", "500", BLACK), cell(chain.mnt_price ? fmtPrice(chain.mnt_price.usd) : "N/A", "600", BLACK), cell("Current", "400", GRAY)],
    ];
    summaryCards = [
      { label: "CURRENT TVL", value: chain.defi_tvl_formatted, bg: "#F8F8F8", valueColor: BLACK },
      { label: "30D CHANGE", value: fmtPct(chain.tvl_change_30d_pct), bg: (chain.tvl_change_30d_pct || 0) >= 0 ? "#F0FDF4" : "#FFF1F2", valueColor: pctColor(chain.tvl_change_30d_pct) },
      { label: "TVL RANK", value: chain.tvl_rank_among_chains ? `#${chain.tvl_rank_among_chains}` : "N/A", bg: "#F8F8F8", valueColor: BLACK },
    ];
  } else if (tokenHist) {
    title = `${tokenHist.token_id} Price Trend`;
    meta = `${tokenHist.days}-day price history, live via CoinGecko`;
    summaryCards = [
      { label: "PRICE NOW", value: fmtPrice(tokenHist.price_now), bg: "#F8F8F8", valueColor: BLACK },
      { label: `${tokenHist.days}D CHANGE`, value: fmtPct(tokenHist.change_pct), bg: tokenHist.change_pct >= 0 ? "#F0FDF4" : "#FFF1F2", valueColor: pctColor(tokenHist.change_pct) },
      { label: "TREND", value: tokenHist.trend, bg: "#F8F8F8", valueColor: BLACK },
    ];
    chartData = { values: tokenHist.sparkline, type: "line" };
  } else if (poolHist) {
    title = "Pool Yield History";
    meta = `${poolHist.window_days}-day APY and TVL trend, live via DeFiLlama`;
    summaryCards = [
      { label: "CURRENT APY", value: `${poolHist.apy.current}%`, bg: "#F0FDF4", valueColor: GREEN },
      { label: "STABILITY", value: poolHist.apy.stability, bg: "#F8F8F8", valueColor: BLACK },
      { label: "TVL DIRECTION", value: poolHist.tvl.direction, bg: "#F8F8F8", valueColor: poolHist.tvl.direction === "inflow" ? GREEN : RED },
    ];
    chartData = { values: poolHist.sparkline, type: "line" };
  }

  return { title, meta, summaryCards, tableHeaders, tableRows, tableGridCols, chartData };
}

// ── Sub-components ──────────────────────────────────────────────────────────
function StepRow({ step }) {
  const circleBg = step.status === "done" ? GREEN : step.status === "active" ? BLACK : "#E5E5E5";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "15px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: circleBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "background 0.3s" }}>
        {step.status === "done" && <CheckIcon />}
        {step.status === "active" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white", animation: "fleepit-pulse 1s ease-in-out infinite" }} />}
      </div>
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: step.status === "pending" ? LGRAY : BLACK, marginBottom: 2 }}>{step.title}</div>
        <div style={{ fontSize: 12, color: LGRAY, lineHeight: 1.45, marginTop: 2 }}>{step.detail}</div>
      </div>
    </div>
  );
}

function SummaryCard({ c }) {
  return (
    <div style={{ background: c.bg || "#F8F8F8", borderRadius: 14, padding: 20, border: "1px solid rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", color: LGRAY, marginBottom: 8, textTransform: "uppercase" }}>{c.label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em", color: c.valueColor || BLACK, lineHeight: 1, marginBottom: c.sub ? 5 : 0 }}>{c.value}</div>
      {c.sub && <div style={{ fontSize: 12, fontWeight: 500, color: c.subColor || GRAY, marginTop: 1 }}>{c.sub}</div>}
    </div>
  );
}

const SUGGESTIONS = [
  { label: "Top 5 tokens today", q: "Top 5 performing tokens on Mantle right now" },
  { label: "Best yield pools", q: "Best yield pools on Mantle" },
  { label: "Protocol rankings", q: "Which protocols have the most liquidity on Mantle" },
  { label: "Invest $1,000 for 6 months", q: "If I invest $1000 in the best Mantle pool for 6 months what is my return" },
  { label: "Chain health", q: "Mantle chain health, TVL and activity trends" },
];

const HISTORY_KEY = "fleepit_history_v1";
function loadStoredHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function FleepitApp({ onHome, onNavAlerts, initialQuery, onConsumeInitialQuery }) {
  const [mode, setMode] = useState("home"); // home | loading | results
  const [inputValue, setInputValue] = useState("");
  const [currentQuery, setCurrentQuery] = useState("");
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [briefCards, setBriefCards] = useState([]);
  const [briefLoading, setBriefLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState(loadStoredHistory); // { question, answer }[], most recent last, persisted across reloads
  const historyRef = useRef([]);
  useEffect(() => {
    historyRef.current = history;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* storage unavailable, memory just won't persist */ }
  }, [history]);
  const recRef = useRef(null);
  const transcriptRef = useRef("");
  const hasKey = !!GROQ_API_KEY;
  const voiceSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fleepit-fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fleepit-fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fleepit-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
      @keyframes fleepit-shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
      .fleepit-sk { background: linear-gradient(90deg, #EAEAEA 25%, #E0E0E0 50%, #EAEAEA 75%); background-size: 600px 100%; animation: fleepit-shimmer 1.6s infinite; border-radius: 14px; }
      .fleepit-chip:hover { background: #F0F0F0 !important; border-color: rgba(0,0,0,0.14) !important; }
      .fleepit-research-btn:hover { background: #333333 !important; }
      .fleepit-back-btn:hover { background: #F5F5F5 !important; }
      .fleepit-nav-link:hover { color: #0A0A0A !important; }
      input::placeholder { color: #BBBBBB; }

      .fleepit-page-pad-home { padding: 72px 44px 60px; }
      .fleepit-page-pad-loading { padding: 80px 44px; }
      .fleepit-page-pad-results { padding: 60px 44px 80px; }
      .fleepit-grid-3 { grid-template-columns: repeat(3, 1fr); }
      .fleepit-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .fleepit-table-inner { min-width: 560px; }

      .fleepit-followup-sticky { position: static; }

      @media (max-width: 640px) {
        .fleepit-page-pad-home { padding: 96px 16px 40px !important; }
        .fleepit-page-pad-loading { padding: 96px 16px !important; }
        .fleepit-page-pad-results { padding: 96px 16px 56px !important; }
        .fleepit-grid-3 { grid-template-columns: 1fr !important; }
        .fleepit-hero-h1 { font-size: 34px !important; }
        .fleepit-block-pad { padding: 18px !important; }
        .fleepit-followup-sticky { position: sticky !important; bottom: 12px; z-index: 5; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // ── Brief cards (no LLM — direct live data, matches design's loadBrief) ──
  useEffect(() => {
    (async () => {
      try {
        const [chain, poolsRes] = await Promise.all([
          toolExecutors.get_mantle_chain_metrics(),
          toolExecutors.list_mantle_pools({ limit: 1, sort_by: "apy", min_tvl_usd: 100000 }),
        ]);
        const top = poolsRes.pools?.[0];
        setBriefCards([
          {
            label: "MANTLE TVL", value: chain.defi_tvl_formatted || "N/A",
            detail: "Total value locked across all protocols",
            signal: chain.tvl_change_7d_pct != null ? `${fmtPct(chain.tvl_change_7d_pct)} past 7d` : "DeFiLlama",
            signalColor: pctColor(chain.tvl_change_7d_pct), dark: false,
          },
          {
            label: "MNT PRICE", value: chain.mnt_price ? fmtPrice(chain.mnt_price.usd) : "Loading",
            detail: "Native Mantle network token",
            signal: chain.mnt_price?.change_24h_pct != null ? `${fmtPct(chain.mnt_price.change_24h_pct)} past 24h` : "CoinGecko",
            signalColor: chain.mnt_price?.change_24h_pct != null ? (chain.mnt_price.change_24h_pct >= 0 ? "#4ADE80" : "#F87171") : "rgba(255,255,255,0.35)",
            dark: true,
          },
          {
            label: "TOP YIELD", value: top ? `${(top.apy || 0).toFixed(1)}% APY` : "N/A",
            detail: top ? `${top.symbol} on ${top.project}` : "Scanning pools",
            signal: top ? top.tvlFormatted + " TVL" : "", signalColor: GRAY, dark: false,
          },
        ]);
      } catch { /* leave skeleton */ }
      setBriefLoading(false);
    })();
  }, []);

  // ── Research ──────────────────────────────────────────────────────────
  const CONVERSATIONAL_SHELL = { title: "Fleepit Analyst", meta: "Ready when you are", summaryCards: [], tableHeaders: [], tableRows: [], tableGridCols: "", chartData: null };

  const research = useCallback(async (query) => {
    const q = query.trim();
    if (!q) return;
    setMode("loading");
    setCurrentQuery(q);
    setInputValue("");
    const liveSteps = [];
    setSteps([]);
    setResult(null);

    const collected = [];
    let enteredResults = false;

    const { answer, sources, conversational } = await runResearchAgent({
      question: q, apiKey: GROQ_API_KEY, history: historyRef.current,
      onStep: (s) => {
        if (s.type === "tool_call") {
          if (liveSteps.length) liveSteps[liveSteps.length - 1].status = "done";
          liveSteps.push({ title: s.label, detail: "Querying live Mantle data…", status: "active" });
          setSteps([...liveSteps]);
        } else if (s.type === "tool_result") {
          if (liveSteps.length) liveSteps[liveSteps.length - 1].detail = s.summary || "Done";
          collected.push({ name: s.name, result: s.result });
          setSteps([...liveSteps]);
        } else if (s.type === "stream") {
          // Render progressively as tokens arrive instead of waiting for
          // the whole answer: flip into the results view on the very
          // first chunk, using whatever tool data is already collected.
          const base = collected.length ? formatResults(collected, q) : CONVERSATIONAL_SHELL;
          setResult({ ...base, analysis: s.text, sources: [], streaming: true });
          if (!enteredResults) { enteredResults = true; setMode("results"); }
        }
      },
    });

    const formatted = conversational ? CONVERSATIONAL_SHELL : formatResults(collected, q);
    setResult({ ...formatted, analysis: answer, sources: sources.length ? sources : ["Fleepit Research Agent"], streaming: false });
    setMode("results");

    setHistory((h) => [...h, { question: q, answer }].slice(-6));
  }, []);

  // A nav quick-link (Tokens/Pools/Chain Health) clicked from another page
  // arrives here as a query to run on landing, since this component only
  // mounts once App.jsx has already switched views.
  useEffect(() => {
    if (initialQuery) {
      research(initialQuery);
      onConsumeInitialQuery?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const goHome = () => {
    setMode("home"); setInputValue(""); setCurrentQuery(""); setSteps([]); setResult(null);
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* storage unavailable */ }
  };
  const submitQuery = () => research(inputValue);

  const toggleVoice = () => {
    if (!voiceSupported) return;
    if (listening) { recRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = true;
    transcriptRef.current = "";
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join("");
      transcriptRef.current = text;
      setInputValue(text);
    };
    rec.onend = () => {
      setListening(false);
      const finalText = transcriptRef.current.trim();
      if (finalText) research(finalText);
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const isHome = mode === "home", isLoading = mode === "loading", hasResults = mode === "results";
  const r = result || {};
  const voiceIconColor = listening ? "#FFFFFF" : "#5A5A5A";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", background: "#F5F5F5", color: BLACK }}>
      {/* NAV */}
      <AppNav
        active="app"
        onHome={onHome}
        onNavApp={goHome}
        onNavAlerts={onNavAlerts}
        onQuickQuery={research}
      />

      <div style={{ paddingTop: 60 }}>
        {/* HOME */}
        {isHome && (
          <div className="fleepit-page-pad-home" style={{ maxWidth: 880, margin: "0 auto", animation: "fleepit-fadeUp 0.5s ease both" }}>
            <h1 className="fleepit-hero-h1" style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.05, color: BLACK, marginBottom: 16 }}>
              Research anything<br />on Mantle.
            </h1>
            <p style={{ fontSize: 16, color: "#7A7A7A", maxWidth: 460, lineHeight: 1.65, fontWeight: 400, marginBottom: 44 }}>
              Tokens. Pools. RWAs. Protocols. Investment scenarios. One research agent, every answer.
            </p>

            <div style={{ marginBottom: 18 }}>
              <SearchBox
                placeholder="Ask anything about Mantle...  e.g. top 5 tokens today, best yield, compare pools"
                value={inputValue}
                onChange={setInputValue}
                onSubmit={submitQuery}
                voiceSupported={voiceSupported}
                listening={listening}
                onToggleVoice={toggleVoice}
                voiceIconColor={voiceIconColor}
                disabled={!hasKey}
              />
            </div>

            {!hasKey && (
              <p style={{ fontSize: 12, color: RED, marginBottom: 20 }}>Add your Groq API key in the environment to activate the research agent.</p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 64 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => research(s.q)} className="fleepit-chip" style={{ background: "white", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 9999, padding: "7px 16px", fontSize: 13, fontWeight: 500, color: "#5A5A5A", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: LGRAY, textTransform: "uppercase", marginBottom: 16 }}>Live Mantle Intelligence</div>

            {briefLoading ? (
              <div className="fleepit-grid-3" style={{ display: "grid", gap: 14 }}>
                <div className="fleepit-sk" style={{ height: 144 }} />
                <div className="fleepit-sk" style={{ height: 144, animationDelay: "0.15s" }} />
                <div className="fleepit-sk" style={{ height: 144, animationDelay: "0.3s" }} />
              </div>
            ) : (
              <div className="fleepit-grid-3" style={{ display: "grid", gap: 14, animation: "fleepit-fadeIn 0.4s ease both" }}>
                {briefCards.map((bc, i) => (
                  <div key={i} style={{ background: bc.dark ? BLACK : "white", borderRadius: 18, padding: 24, border: bc.dark ? "none" : "1px solid rgba(0,0,0,0.07)" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: bc.dark ? "rgba(255,255,255,0.3)" : LGRAY, marginBottom: 14, textTransform: "uppercase" }}>{bc.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.035em", color: bc.dark ? "white" : (bc.label === "TOP YIELD" ? GREEN : BLACK), marginBottom: 6, lineHeight: 1 }}>{bc.value}</div>
                    <div style={{ fontSize: 13, color: bc.dark ? "rgba(255,255,255,0.42)" : "#7A7A7A", lineHeight: 1.45, marginBottom: 12 }}>{bc.detail}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: bc.signalColor }}>{bc.signal}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {isLoading && (
          <div className="fleepit-page-pad-loading" style={{ maxWidth: 680, margin: "0 auto", animation: "fleepit-fadeIn 0.3s ease both" }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.025em", color: BLACK, marginBottom: 6, lineHeight: 1.4, maxWidth: 560 }}>{currentQuery}</div>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: LGRAY, textTransform: "uppercase", marginBottom: 52 }}>Researching</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {steps.map((step, i) => <StepRow key={i} step={step} />)}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {hasResults && (
          <div className="fleepit-page-pad-results" style={{ maxWidth: 940, margin: "0 auto", animation: "fleepit-fadeUp 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
              <button onClick={goHome} className="fleepit-back-btn" style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.1)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BackIcon />
              </button>
              <span style={{ fontSize: 13, color: LGRAY, maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentQuery}</span>
            </div>

            <h2 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em", color: BLACK, marginBottom: 8, lineHeight: 1.2 }}>{r.title}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 36 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#9B9B9B" }}>{r.meta}</span>
            </div>

            {r.summaryCards?.length > 0 && (
              <div className="fleepit-grid-3" style={{ display: "grid", gap: 12, marginBottom: 24 }}>
                {r.summaryCards.map((c, i) => <SummaryCard key={i} c={c} />)}
              </div>
            )}

            {r.tableHeaders?.length > 0 && (
              <div className="fleepit-table-scroll" style={{ background: "white", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div className="fleepit-table-inner">
                  <div style={{ display: "grid", gridTemplateColumns: r.tableGridCols, padding: "13px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#FAFAFA" }}>
                    {r.tableHeaders.map((th, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", color: "#9B9B9B", textTransform: "uppercase" }}>{th}</div>
                    ))}
                  </div>
                  {r.tableRows.map((row, ri) => (
                    <div key={ri} style={{ display: "grid", gridTemplateColumns: r.tableGridCols, padding: "13px 24px", borderBottom: ri < r.tableRows.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                      {row.map((c, ci) => (
                        <div key={ci} style={{ fontWeight: c.weight, color: c.color, fontSize: 13, fontVariantNumeric: "tabular-nums", lineHeight: 1.5, paddingRight: 12 }}>
                          {c.href
                            ? <a href={c.href} target="_blank" rel="noreferrer" style={{ color: c.color, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(0,0,0,0.2)" }}>{c.v}</a>
                            : c.v}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {r.chartData && (
              <div className="fleepit-block-pad" style={{ background: "white", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: "28px 28px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", color: "#9B9B9B", textTransform: "uppercase", marginBottom: 20 }}>
                  {r.chartData.type === "line" ? "Trend" : "Comparison"}
                </div>
                {r.chartData.type === "line" ? <LineChart data={r.chartData} /> : <BarChart data={r.chartData} />}
              </div>
            )}

            {r.analysis && (
              <div className="fleepit-block-pad" style={{ background: "#111111", borderRadius: 18, padding: "28px 32px", marginBottom: 20, color: "white" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <StarIcon />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Research Analysis</span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.82, color: "rgba(255,255,255,0.82)", whiteSpace: "pre-wrap", fontWeight: 400 }}>
                  {cleanAnalysis(r.analysis)}
                  {r.streaming && <span style={{ display: "inline-block", width: 7, height: 15, background: "rgba(255,255,255,0.6)", marginLeft: 2, verticalAlign: "text-bottom", animation: "fleepit-pulse 0.9s ease-in-out infinite" }} />}
                </div>
              </div>
            )}

            {r.sources?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 44 }}>
                {r.sources.map((src, i) => (
                  <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "white", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 9999, padding: "6px 14px" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#7A7A7A" }}>{src}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="fleepit-followup-sticky">
              <SearchBox
                placeholder="Ask a follow-up question..."
                value={inputValue}
                onChange={setInputValue}
                onSubmit={submitQuery}
                voiceSupported={voiceSupported}
                listening={listening}
                onToggleVoice={toggleVoice}
                voiceIconColor={voiceIconColor}
                disabled={!hasKey}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
