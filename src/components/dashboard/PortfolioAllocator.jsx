import { useState } from "react";
import { Wallet, Sparkles, ChevronDown, ChevronUp, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../../config";
import { classifyRisk } from "./PoolCard";
import { cn } from "../../lib/utils";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Risk profiles ─────────────────────────────────────────────────────────────
const RISK_PROFILES = [
  {
    id: "conservative",
    label: "Conservative",
    description: "Stable yields, minimal volatility",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
    dot: "bg-emerald-500",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Mix of stable + growth",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    activeBg: "bg-blue-600",
    activeText: "text-white",
    dot: "bg-blue-500",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    description: "Max yield, higher risk",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    activeBg: "bg-amber-500",
    activeText: "text-white",
    dot: "bg-amber-500",
  },
];

// ── Helper: top pools by risk tier ───────────────────────────────────────────
function getTopPools(pools, riskProfile) {
  const sorted = [...pools].sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0));

  if (riskProfile === "conservative") {
    return sorted.filter((p) => classifyRisk(p) === "low").slice(0, 6);
  }
  if (riskProfile === "balanced") {
    const low  = sorted.filter((p) => classifyRisk(p) === "low").slice(0, 3);
    const med  = sorted.filter((p) => classifyRisk(p) === "medium").slice(0, 3);
    return [...low, ...med];
  }
  // aggressive: mix of medium and high
  const med  = sorted.filter((p) => classifyRisk(p) === "medium").slice(0, 3);
  const high = sorted.filter((p) => classifyRisk(p) === "high").slice(0, 3);
  return [...med, ...high];
}

// ── Helper: format pool summary for prompt ───────────────────────────────────
function poolsToText(pools) {
  return pools
    .map(
      (p, i) =>
        `${i + 1}. ${p.symbol} on ${p.project} — APY: ${(p.apy ?? 0).toFixed(2)}%, TVL: $${
          p.tvlUsd ? (p.tvlUsd / 1e6).toFixed(1) + "M" : "N/A"
        }, Risk: ${classifyRisk(p)}`
    )
    .join("\n");
}

// ── Parse allocation lines from AI response ───────────────────────────────────
function parseAllocations(text) {
  const lines = text.split("\n");
  const allocations = [];

  for (const line of lines) {
    // Match lines like: "• mETH on Lendle — $2,000 (40%) — APY: 8.2%"
    // or: "1. USDY on Ondo - $3000 - 8.5%"
    const amountMatch = line.match(/\$[\d,]+/);
    const pctMatch    = line.match(/(\d+(?:\.\d+)?)\s*%(?:\s*APY|\s*apy|\s*—|\s*\)|\s*$)/);
    const allotPct    = line.match(/\((\d+(?:\.\d+)?)%\)/);

    if (amountMatch && (pctMatch || allotPct)) {
      // Extract pool name — everything before the first dash/—
      const namePart = line.replace(/^[\d•*\-\s.]+/, "").split(/—|-/)[0].trim();
      const amount   = parseInt(amountMatch[0].replace(/[$,]/g, ""), 10);
      const apy      = pctMatch ? parseFloat(pctMatch[1]) : null;
      const alloc    = allotPct ? parseFloat(allotPct[1]) : null;

      if (namePart && amount) {
        allocations.push({ name: namePart, amount, apy, alloc });
      }
    }
  }

  return allocations;
}

// ── Extract blended APY and 12-month from text ───────────────────────────────
function extractSummaryNumbers(text) {
  const blendedMatch  = text.match(/blended\s+APY[:\s]*(\d+(?:\.\d+)?)\s*%/i);
  const earningsMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:over|in|for)?\s*(?:12|twelve)[- ]?month/i)
                     || text.match(/12[- ]?month[^$]*\$\s*([\d,]+(?:\.\d+)?)/i)
                     || text.match(/estimated[^$]*\$\s*([\d,]+(?:\.\d+)?)/i);

  return {
    blendedApy:    blendedMatch  ? parseFloat(blendedMatch[1])  : null,
    yearEarnings:  earningsMatch ? parseFloat(earningsMatch[1].replace(/,/g, "")) : null,
  };
}

// ── Allocation bar ────────────────────────────────────────────────────────────
const BAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-400",
  "bg-violet-500", "bg-rose-400", "bg-cyan-500",
];

function AllocationBar({ allocations }) {
  if (!allocations.length) return null;
  const total = allocations.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-1">
      {allocations.map((a, i) => (
        <div
          key={i}
          className={cn("h-full rounded-sm transition-all", BAR_COLORS[i % BAR_COLORS.length])}
          style={{ width: `${(a.amount / total) * 100}%` }}
          title={`${a.name}: $${a.amount.toLocaleString()}`}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortfolioAllocator({ pools = [] }) {
  const [capital,     setCapital]     = useState("");
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);
  const [expanded,    setExpanded]    = useState(false);
  const [showRaw,     setShowRaw]     = useState(false);

  const canSubmit = capital && Number(capital) >= 10 && pools.length > 0 && !loading;

  async function handleAllocate() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const amount    = Number(capital);
    const topPools  = getTopPools(pools, riskProfile);
    const poolsText = poolsToText(topPools);

    const prompt = `You are a DeFi yield expert specialising in the Mantle blockchain.

A user wants to invest $${amount.toLocaleString()} with a **${riskProfile}** risk profile.

Here are the best current Mantle yield pools for their profile:
${poolsText}

Provide a specific capital allocation across 3–4 of these pools. For each pool include:
- Pool name and protocol
- Dollar amount allocated (must sum to $${amount.toLocaleString()})
- Allocation percentage in parentheses e.g. (40%)
- Expected APY

Then conclude with:
- Blended APY: X.XX%
- Estimated 12-month earnings: $X,XXX
- A 2-sentence rationale for the strategy

Format each pool on its own line starting with a bullet (•). Keep the response under 200 words.`;

    try {
      const resp = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 400,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${resp.status}`);
      }

      const json = await resp.json();
      const text = json.choices?.[0]?.message?.content || "";

      const allocations = parseAllocations(text);
      const summary     = extractSummaryNumbers(text);

      setResult({ text, allocations, ...summary, capital: amount, riskProfile });
    } catch (e) {
      setError(e.message || "Failed to generate allocation. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const activeProfile = RISK_PROFILES.find((r) => r.id === riskProfile);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-navy/8 flex items-center justify-center flex-shrink-0">
          <Wallet size={18} className="text-navy" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-navy leading-tight">AI Portfolio Allocator</h2>
          <p className="text-xs text-gray-400">Get a personalised yield strategy for Mantle</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-navy/50 hover:text-navy transition-colors"
        >
          {expanded ? (
            <><ChevronUp size={15} /> Hide</>
          ) : (
            <><ChevronDown size={15} /> Open</>
          )}
        </button>
      </div>

      {expanded && (
        <div className="p-5">
          {/* Input row */}
          <div className="flex flex-col sm:flex-row gap-4 mb-5">
            {/* Capital input */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Capital to Deploy (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">$</span>
                <input
                  type="number"
                  min="10"
                  step="100"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full pl-7 pr-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/30 transition-all"
                />
              </div>
            </div>

            {/* Risk selector */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Risk Profile
              </label>
              <div className="flex gap-2">
                {RISK_PROFILES.map((rp) => (
                  <button
                    key={rp.id}
                    onClick={() => setRiskProfile(rp.id)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                      riskProfile === rp.id
                        ? `${rp.activeBg} ${rp.activeText} border-transparent shadow-sm`
                        : `${rp.bg} ${rp.color} ${rp.border} hover:brightness-95`
                    )}
                  >
                    {rp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleAllocate}
            disabled={!canSubmit}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
              canSubmit
                ? "bg-navy text-white hover:bg-navy/90 shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Generating strategy…</>
            ) : (
              <><Sparkles size={16} /> Generate Allocation</>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Result card */}
          {result && (
            <div className="mt-5">
              {/* Summary strip */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[120px] bg-navy/5 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5 font-medium">Capital</p>
                  <p className="text-base font-black text-navy">${result.capital.toLocaleString()}</p>
                </div>
                {result.blendedApy !== null && (
                  <div className="flex-1 min-w-[120px] bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-emerald-600 mb-0.5 font-medium">Blended APY</p>
                    <p className="text-base font-black text-emerald-700">{result.blendedApy.toFixed(2)}%</p>
                  </div>
                )}
                {result.yearEarnings !== null && (
                  <div className="flex-1 min-w-[120px] bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-blue-600 mb-0.5 font-medium">Est. 12-month</p>
                    <p className="text-base font-black text-blue-700">
                      +${result.yearEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )}
                <div className="flex-1 min-w-[120px] bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5 font-medium">Profile</p>
                  <p className={cn("text-base font-black capitalize", activeProfile?.color)}>
                    {result.riskProfile}
                  </p>
                </div>
              </div>

              {/* Allocation breakdown */}
              {result.allocations.length > 0 && (
                <div className="mb-4">
                  <AllocationBar allocations={result.allocations} />
                  <div className="space-y-2 mt-3">
                    {result.allocations.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                      >
                        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", BAR_COLORS[i % BAR_COLORS.length])} />
                        <span className="flex-1 text-xs font-semibold text-gray-700 truncate">{a.name}</span>
                        {a.apy !== null && (
                          <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 flex-shrink-0">
                            <TrendingUp size={11} />
                            {a.apy.toFixed(2)}%
                          </span>
                        )}
                        {a.alloc !== null && (
                          <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                            {a.alloc}%
                          </span>
                        )}
                        <span className="text-xs font-bold text-navy flex-shrink-0">
                          ${a.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw AI text toggle */}
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="flex items-center gap-1.5 text-xs font-semibold text-navy/50 hover:text-navy transition-colors mb-2"
              >
                {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showRaw ? "Hide" : "Show"} full AI rationale
              </button>

              {showRaw && (
                <div className="bg-navy/4 border border-navy/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-navy/80 leading-relaxed whitespace-pre-wrap">
                    {result.text}
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                ⚠️ AI-generated allocations are for informational purposes only and do not constitute
                financial advice. Always DYOR before deploying capital.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
