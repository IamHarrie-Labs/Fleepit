import { useState, Fragment } from "react";
import {
  Rocket, Coins, Layers, Gift, TrendingUp, Trophy, Zap,
  Building2, Users, Shield, BarChart3, Landmark, Bot,
  CheckCircle2, Clock, Circle, ChevronDown, ChevronUp,
} from "lucide-react";
import { ROADMAP } from "../data/roadmap";
import { cn } from "../lib/utils";

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP = {
  Rocket, Coins, Layers, Gift, TrendingUp, Trophy, Zap,
  Building2, Users, Shield, BarChart3, Landmark, Bot,
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  completed: {
    circle:  "bg-emerald-500",
    badge:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    date:    "text-emerald-600",
    dot:     "bg-emerald-500",
    line:    "bg-emerald-200",
    Icon:    CheckCircle2,
    label:   "Completed",
  },
  "in-progress": {
    circle:  "bg-amber-400",
    badge:   "bg-amber-100 text-amber-700 border-amber-200",
    date:    "text-amber-600",
    dot:     "bg-amber-400",
    line:    "bg-amber-200",
    Icon:    Clock,
    label:   "In Progress",
  },
  upcoming: {
    circle:  "bg-gray-300",
    badge:   "bg-gray-100 text-gray-500 border-gray-200",
    date:    "text-gray-400",
    dot:     "bg-gray-300",
    line:    "bg-gray-200",
    Icon:    Circle,
    label:   "Upcoming",
  },
};

// ── Group milestones by year ──────────────────────────────────────────────────
function getYear(dateStr) {
  if (dateStr.includes("2026")) return "2026";
  if (dateStr.includes("2025")) return "2025";
  if (dateStr.includes("2024")) return "2024";
  return "2023";
}

const ERA_LABELS = {
  "2023": "Foundation",
  "2024": "Growth",
  "2025": "Expansion",
  "2026": "Future",
};

// ── Compact row for completed milestones ──────────────────────────────────────
function CompletedRow({ milestone }) {
  const cfg = STATUS.completed;
  const IconComponent = ICON_MAP[milestone.icon] ?? Circle;

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white hover:shadow-sm transition-all group">
      {/* Icon circle */}
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", cfg.circle)}>
        <IconComponent size={14} className="text-white" />
      </div>
      {/* Title */}
      <span className="flex-1 text-sm font-semibold text-gray-700 group-hover:text-navy transition-colors">
        {milestone.title}
      </span>
      {/* Date badge */}
      <span className={cn("text-xs font-medium flex-shrink-0", cfg.date)}>{milestone.date}</span>
      {/* Check */}
      <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
    </div>
  );
}

// ── Full card for in-progress / upcoming milestones ───────────────────────────
function ActiveCard({ milestone, index, total }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS[milestone.status];
  const IconComponent = ICON_MAP[milestone.icon] ?? Circle;
  const isLast = index === total - 1;

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-14">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-md border-4 border-white flex-shrink-0",
          cfg.circle,
          milestone.status === "in-progress" && "animate-pulse"
        )}>
          <IconComponent size={20} className="text-white" />
        </div>
        {!isLast && <div className={cn("w-0.5 flex-1 mt-2 min-h-8", cfg.line)} />}
      </div>

      {/* Card */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-navy/20 hover:shadow-md transition-all">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className={cn("text-xs font-bold mb-0.5", cfg.date)}>{milestone.date}</p>
              <h3 className="text-sm font-bold text-navy leading-snug">{milestone.title}</h3>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5",
              cfg.badge
            )}>
              <cfg.Icon size={10} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">{milestone.description}</p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-navy/60 hover:text-navy transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Why it matters
          </button>
          {expanded && (
            <div className="mt-2 rounded-lg bg-navy/5 border border-navy/10 px-3 py-2.5">
              <p className="text-xs text-navy/80 leading-relaxed">{milestone.whyItMatters}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Year section ──────────────────────────────────────────────────────────────
function YearSection({ year, milestones }) {
  const completed   = milestones.filter((m) => m.status === "completed");
  const active      = milestones.filter((m) => m.status !== "completed");

  return (
    <div className="mb-8">
      {/* Year header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
            {ERA_LABELS[year] || year}
          </span>
          <span className="text-2xl font-black text-navy leading-tight">{year}</span>
        </div>
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium flex-shrink-0">
          {completed.length}/{milestones.length} done
        </span>
      </div>

      {/* Completed milestones — compact list */}
      {completed.length > 0 && (
        <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-2 mb-4 divide-y divide-gray-100">
          {completed.map((m) => (
            <CompletedRow key={m.id} milestone={m} />
          ))}
        </div>
      )}

      {/* Active / upcoming milestones — full cards with spine */}
      {active.length > 0 && (
        <div className="ml-2">
          {active.map((m, i) => (
            <ActiveCard key={m.id} milestone={m} index={i} total={active.length} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Roadmap() {
  const total     = ROADMAP.length;
  const completed = ROADMAP.filter((m) => m.status === "completed").length;
  const pct       = Math.round((completed / total) * 100);

  // Group by year
  const byYear = ROADMAP.reduce((acc, m) => {
    const y = getYear(m.date);
    if (!acc[y]) acc[y] = [];
    acc[y].push(m);
    return acc;
  }, {});

  return (
    <div>
      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-navy">Mantle Roadmap</h1>
        <p className="text-gray-500 text-sm mt-1">
          Key milestones shaping the Mantle ecosystem — and why they matter
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              Ecosystem Progress
            </p>
            <p className="text-3xl font-black text-navy leading-none">
              {pct}%
              <span className="text-sm font-semibold text-gray-400 ml-2">
                {completed} of {total} milestones
              </span>
            </p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-lg font-bold text-emerald-600">{completed}</p>
              <p className="text-xs text-gray-400">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-500">
                {ROADMAP.filter((m) => m.status === "in-progress").length}
              </p>
              <p className="text-xs text-gray-400">In Progress</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-400">
                {ROADMAP.filter((m) => m.status === "upcoming").length}
              </p>
              <p className="text-xs text-gray-400">Upcoming</p>
            </div>
          </div>
        </div>
        {/* Track */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Mantle is {pct}% through its core roadmap objectives
        </p>
      </div>

      {/* Year sections */}
      {Object.entries(byYear)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, milestones]) => (
          <YearSection key={year} year={year} milestones={milestones} />
        ))}
    </div>
  );
}
