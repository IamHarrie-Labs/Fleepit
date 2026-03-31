import { useState, useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import FleepitLogo from "./components/layout/FleepitLogo";
import Dashboard from "./pages/Dashboard";
import EcosystemFeed from "./pages/EcosystemFeed";
import Subscribe from "./pages/Subscribe";
import Roadmap from "./pages/Roadmap";
import { useMntPrice } from "./hooks/useMntPrice";
import { usePools } from "./hooks/usePools";
import { checkAndSendScheduledAlerts } from "./utils/scheduler";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { data: mntPrice } = useMntPrice();
  const { pools, loading, error, onchainEvents } = usePools();

  // Fire scheduled Telegram alerts once pools are ready
  useEffect(() => {
    if (!loading && pools.length > 0) {
      checkAndSendScheduledAlerts(pools);
    }
  }, [loading, pools]);

  return (
    <div className="flex min-h-screen bg-ash font-poppins">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        mntPrice={mntPrice}
      />

      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {/* Mobile top bar — logo only, hidden on desktop */}
        <div className="lg:hidden flex items-center px-4 py-3 bg-navy border-b border-white/10">
          <FleepitLogo variant="dark" size="sm" />
        </div>

        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {currentPage === "dashboard" && <Dashboard pools={pools} loading={loading} error={error} />}
          {currentPage === "feed" && <EcosystemFeed onchainEvents={onchainEvents} />}
          {currentPage === "subscribe" && <Subscribe />}
          {currentPage === "roadmap" && <Roadmap />}
        </div>
      </main>

      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}
