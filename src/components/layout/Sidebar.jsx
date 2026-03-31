import { BarChart2, Rss, Mail, MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/utils";
import FleepitLogo from "./FleepitLogo";

const navItems = [
  { id: "dashboard", label: "Yield Dashboard", icon: BarChart2 },
  { id: "feed", label: "Ecosystem Feed", icon: Rss },
  { id: "subscribe", label: "Subscribe", icon: Mail },
  { id: "roadmap", label: "Roadmap", icon: MapPin },
];

export default function Sidebar({ currentPage, onNavigate, mntPrice }) {
  const isPositive = mntPrice?.change24h >= 0;

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-navy z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <FleepitLogo variant="dark" size="md" showSub />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              currentPage === id
                ? "bg-white/15 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/8"
            )}
          >
            <Icon size={18} />
            {label}
            {currentPage === id && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
            )}
          </button>
        ))}
      </nav>

      {/* MNT Price Ticker */}
      <div className="mx-3 mb-4 rounded-xl bg-white/8 border border-white/10 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-white/40 text-xs font-medium">MNT / USD</p>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        {mntPrice ? (
          <div className="flex items-end justify-between">
            <span className="text-white text-lg font-bold">
              ${mntPrice.usd.toFixed(4)}
            </span>
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-semibold",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {isPositive ? "+" : ""}
              {mntPrice.change24h.toFixed(2)}%
            </span>
          </div>
        ) : (
          <div className="h-7 w-24 rounded bg-white/10 animate-pulse" />
        )}
      </div>
    </aside>
  );
}
