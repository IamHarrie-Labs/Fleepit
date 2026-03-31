import { Sparkles, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";

export function classifyRisk(pool) {
  const apy = pool.apy ?? 0;
  if (pool.ilRisk === "yes" || apy > 50) return "high";
  if (apy > 15) return "medium";
  return "low";
}

export function formatTVL(tvl) {
  if (!tvl) return "$0";
  if (tvl >= 1_000_000_000) return `$${(tvl / 1_000_000_000).toFixed(2)}B`;
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`;
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}

const riskConfig = {
  low: { label: "Low Risk", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "Medium Risk", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  high: { label: "High Risk", classes: "bg-red-50 text-red-700 border-red-200" },
};

export default function PoolCard({ pool, onAnalyze }) {
  const risk = classifyRisk(pool);
  const { label, classes } = riskConfig[risk];
  const apy = pool.apy ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-navy/20 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-navy/60 uppercase tracking-wider mb-0.5">
            {pool.project}
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {pool.symbol}
          </p>
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border ml-2 whitespace-nowrap",
            classes
          )}
        >
          {label}
        </span>
      </div>

      {/* APY */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-navy">
            {apy.toFixed(2)}%
          </span>
          <span className="text-xs text-gray-400 font-medium">APY</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <TrendingUp size={12} className="text-gray-400" />
          <span className="text-xs text-gray-400">
            TVL: {formatTVL(pool.tvlUsd)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="text-xs text-gray-400">
          {pool.rewardTokens?.length > 0 && (
            <span>{pool.rewardTokens.length} reward token{pool.rewardTokens.length > 1 ? "s" : ""}</span>
          )}
        </div>
        <button
          onClick={() => onAnalyze(pool)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy/5 text-navy text-xs font-semibold hover:bg-navy hover:text-white transition-all group-hover:bg-navy group-hover:text-white"
        >
          <Sparkles size={13} />
          Analyze with AI
        </button>
      </div>
    </div>
  );
}
