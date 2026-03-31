import { cn } from "../../lib/utils";

/**
 * FleepitLogo
 * Replicates the brand mark: bold "Fleep" + "It" inside a dark-green rectangle.
 *
 * Props:
 *   variant  "dark"  – white "Fleep" text  (for navy sidebar background)
 *            "light" – black "Fleep" text  (for white / ash backgrounds)
 *   size     "sm" | "md" | "lg"
 *   showSub  boolean – show the "Mantle Intelligence" subtitle
 */
export default function FleepitLogo({
  variant = "dark",
  size = "md",
  showSub = false,
  className = "",
}) {
  const sizeMap = {
    sm: { text: "text-lg",  badge: "text-base  px-1   py-0.5 rounded   ml-1",   sub: "text-[10px]" },
    md: { text: "text-2xl", badge: "text-xl    px-1.5 py-0.5 rounded-md ml-1.5", sub: "text-xs"     },
    lg: { text: "text-3xl", badge: "text-2xl   px-2   py-1   rounded-md ml-2",   sub: "text-sm"     },
  };

  const s = sizeMap[size] ?? sizeMap.md;
  const fleepColor = variant === "dark" ? "text-white" : "text-gray-900";
  const subColor   = variant === "dark" ? "text-white/40" : "text-gray-400";

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-0 leading-none">
        {/* "Fleep" */}
        <span className={cn("font-black tracking-tight", s.text, fleepColor)}>
          Fleep
        </span>
        {/* "It" badge — dark green rectangle matching the brand image */}
        <span
          className={cn(
            "font-black text-navy leading-none inline-flex items-center justify-center",
            "bg-white",
            s.badge
          )}
        >
          It
        </span>
      </div>

      {showSub && (
        <p className={cn("mt-0.5", s.sub, subColor)}>Mantle Intelligence</p>
      )}
    </div>
  );
}
