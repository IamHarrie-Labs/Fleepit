import { BarChart2, Rss, Mail, MapPin } from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart2 },
  { id: "feed", label: "Feed", icon: Rss },
  { id: "subscribe", label: "Subscribe", icon: Mail },
  { id: "roadmap", label: "Roadmap", icon: MapPin },
];

export default function BottomNav({ currentPage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 flex lg:hidden bg-white border-t border-gray-200 z-40 safe-area-inset">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            currentPage === id ? "text-navy" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Icon size={20} strokeWidth={currentPage === id ? 2.5 : 1.8} />
          {label}
        </button>
      ))}
    </nav>
  );
}
