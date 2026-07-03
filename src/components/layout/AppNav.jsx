import { useState, useEffect } from "react";
import FleepitLogo from "./FleepitLogo";

function MenuIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      {open ? (
        <path d="M5 5L15 15M15 5L5 15" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <>
          <path d="M3 6H17" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 10H17" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 14H17" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/**
 * Shared top nav across FleepitApp and Alerts.
 * Collapses into a hamburger drawer below 768px so nothing overflows.
 *
 * Props:
 *   active        'app' | 'alerts'
 *   onHome        click logo -> back to Landing
 *   onNavApp      go to research terminal
 *   onNavAlerts   go to Alerts page
 *   onQuickQuery  optional (query: string) => void, wires the Tokens/Pools/Chain
 *                 Health shortcuts — same on every page, since they're just
 *                 shortcuts into the research terminal, not page-specific content
 */
const QUICK_LINKS = [
  { label: "Pools", q: "Best yield pools on Mantle right now" },
  { label: "Chain Health", q: "Mantle chain health, TVL and activity" },
];

export default function AppNav({ active, onHome, onNavApp, onNavAlerts, onQuickQuery }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [active]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .fleepit-nav-burger { display: none; }
      @media (max-width: 768px) {
        .fleepit-nav-desktop { display: none !important; }
        .fleepit-nav-burger { display: flex !important; }
        .fleepit-appnav-bar { padding: 0 16px !important; }
      }
      .fleepit-nav-drawer .fleepit-nav-link {
        display: block;
        width: 100%;
        padding: 14px 4px;
        border-top: 1px solid rgba(0,0,0,0.06);
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const linkStyle = (isActive) => ({
    fontSize: 13,
    fontWeight: 500,
    color: isActive ? "#0A0A0A" : "#6B6B6B",
    cursor: "pointer",
    transition: "color 0.15s",
  });

  const go = (fn) => () => { fn?.(); setOpen(false); };

  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "rgba(245,245,245,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.06)", fontFamily: "'DM Sans', system-ui, sans-serif" }} className="fleepit-appnav-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onHome}>
          <FleepitLogo variant="light" size="sm" />
        </div>

        <div className="fleepit-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {onQuickQuery && QUICK_LINKS.map((l) => (
            <span key={l.label} className="fleepit-nav-link" onClick={() => onQuickQuery(l.q)} style={linkStyle(false)}>{l.label}</span>
          ))}
          <span className="fleepit-nav-link" onClick={onNavApp} style={linkStyle(active === "app")}>Research</span>
          <span className="fleepit-nav-link" onClick={onNavAlerts} style={linkStyle(active === "alerts")}>Alerts</span>
        </div>

        <div className="fleepit-nav-desktop" style={{ display: "flex", alignItems: "center" }}>
          <a href="/docs" target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: "#6B6B6B", textDecoration: "none", transition: "color 0.15s" }} className="fleepit-nav-link">Docs</a>
        </div>

        <button
          className="fleepit-nav-burger"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", borderRadius: 10 }}
        >
          <MenuIcon open={open} />
        </button>
      </nav>

      {open && (
        <div className="fleepit-nav-drawer" style={{ position: "fixed", top: 60, left: 0, right: 0, zIndex: 99, background: "#F5F5F5", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "8px 20px 20px", display: "flex", flexDirection: "column", gap: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
          {onQuickQuery && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {QUICK_LINKS.map((l) => (
                <span key={l.label} className="fleepit-nav-link" onClick={go(() => onQuickQuery(l.q))} style={linkStyle(false)}>{l.label}</span>
              ))}
            </div>
          )}
          <button onClick={go(onNavApp)} style={{ textAlign: "left", background: "none", border: "none", padding: "14px 4px", fontSize: 15, fontWeight: 500, color: active === "app" ? "#0A0A0A" : "#6B6B6B", borderTop: "1px solid rgba(0,0,0,0.06)" }}>Research</button>
          <button onClick={go(onNavAlerts)} style={{ textAlign: "left", background: "none", border: "none", padding: "14px 4px", fontSize: 15, fontWeight: 500, color: active === "alerts" ? "#0A0A0A" : "#6B6B6B", borderTop: "1px solid rgba(0,0,0,0.06)" }}>Alerts</button>
          <a href="/docs" target="_blank" rel="noreferrer" style={{ display: "block", padding: "14px 4px", fontSize: 15, fontWeight: 500, color: "#6B6B6B", borderTop: "1px solid rgba(0,0,0,0.06)", textDecoration: "none" }}>Docs</a>
        </div>
      )}
    </>
  );
}
