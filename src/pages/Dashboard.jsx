import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import FilterBar from "../components/dashboard/FilterBar";
import PoolCard, { classifyRisk } from "../components/dashboard/PoolCard";
import SkeletonCard from "../components/dashboard/SkeletonCard";
import AnalyzeModal from "../components/dashboard/AnalyzeModal";
import PortfolioAllocator from "../components/dashboard/PortfolioAllocator";

export default function Dashboard({ pools = [], loading = true, error = null }) {
  const [riskFilter, setRiskFilter] = useState("all");
  const [analyzePool, setAnalyzePool] = useState(null);

  const filteredPools = pools.filter((p) => {
    if (riskFilter === "all") return true;
    const riskMap = { conservative: "low", balanced: "medium", aggressive: "high" };
    return classifyRisk(p) === (riskMap[riskFilter] || riskFilter);
  });

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Yield Opportunities</h1>
        <p className="text-gray-500 text-sm mt-1">
          Live data powered by DeFiLlama ·{" "}
          {!loading && !error && (
            <span className="text-navy font-medium">{pools.length} pools on Mantle</span>
          )}
        </p>
      </div>

      {/* AI Portfolio Allocator */}
      <PortfolioAllocator pools={pools} />

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar active={riskFilter} onChange={setRiskFilter} />
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-red-700 mb-1">Failed to load yield data</p>
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Pool Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading &&
          Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading &&
          !error &&
          filteredPools.map((pool) => (
            <PoolCard
              key={pool.pool}
              pool={pool}
              onAnalyze={setAnalyzePool}
            />
          ))}

        {!loading && !error && filteredPools.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <p className="text-gray-400 text-sm">No pools match this filter.</p>
          </div>
        )}
      </div>

      {/* Analyze Modal */}
      <AnalyzeModal
        pool={analyzePool}
        onClose={() => setAnalyzePool(null)}
      />
    </div>
  );
}
