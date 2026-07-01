import { cn } from "../../lib/utils";

/**
 * FleepitLogo
 * The brand mark from the official design system: an interlocking
 * bracket glyph paired with the "Fleepit" wordmark. Single source of
 * truth so the icon stays identical across Landing, the app nav, and
 * the browser favicon.
 *
 * Props:
 *   variant  "dark"  – white icon + text  (for dark backgrounds)
 *            "light" – black icon + text (for white / cream backgrounds)
 *   size     "sm" | "md" | "lg"
 *   showSub  boolean – show the "Mantle Intelligence" subtitle
 */
const ICON_PATH =
  "M128.005 191.173C128.448 156.208 156.93 128 192 128L192 64L128 64C128 99.346 99.346 128 64 128L64 192L128 192ZM192 256L64 256C28.654 256 0 227.346 0 192L0 64L64 64L64 0L192 0C227.346 0 256 28.654 256 64L256 192L192 192Z";

const SIZE_MAP = {
  sm: { icon: 20, text: "text-base", sub: "text-[10px]" },
  md: { icon: 24, text: "text-xl", sub: "text-xs" },
  lg: { icon: 30, text: "text-2xl", sub: "text-sm" },
};

export default function FleepitLogo({
  variant = "dark",
  size = "md",
  showSub = false,
  className = "",
}) {
  const s = SIZE_MAP[size] ?? SIZE_MAP.md;
  const color = variant === "dark" ? "#FFFFFF" : "#0A0A0A";
  const subColor = variant === "dark" ? "text-white/40" : "text-gray-400";

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 leading-none">
        <svg width={s.icon} height={s.icon} viewBox="0 0 256 256" fill={color}>
          <path d={ICON_PATH} />
        </svg>
        <span
          className={cn("font-semibold tracking-tight", s.text)}
          style={{ color, letterSpacing: "-0.02em" }}
        >
          Fleepit
        </span>
      </div>

      {showSub && (
        <p className={cn("mt-0.5", s.sub, subColor)}>Mantle Intelligence</p>
      )}
    </div>
  );
}
