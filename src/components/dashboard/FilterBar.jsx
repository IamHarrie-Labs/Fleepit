import { cn } from "../../lib/utils";

const filters = [
  { id: "all", label: "All Pools" },
  { id: "low", label: "Conservative" },
  { id: "medium", label: "Balanced" },
  { id: "high", label: "Aggressive" },
];

export default function FilterBar({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            active === id
              ? "bg-navy text-white border-navy shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:border-navy/30 hover:text-navy"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
