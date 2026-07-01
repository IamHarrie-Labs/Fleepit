import { useState, useEffect } from "react";
import FleepitLogo from "./FleepitLogo";

const GREEN = "#0D9E6E";

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
 * Shared top nav across FleepitApp, Alerts, and Docs.
 * Collapses into a hamburger drawer below 768px so nothing overflows.
 *
 * Props:
 *   active        'app' | 'alerts' | 'docs'
 *   onHome        click logo -> back to Landing
 *   onNavApp      go to research terminal
 *   onNavAlerts   go to Alerts page
 *   onNavDocs     go to Docs page
 *   extra         optional extra nav items (e.g. Tokens/Pools quick links), rendered both desktop + mobile
 */
export default function AppNav({ active, onHome, onNavApp, onNavAlerts, onNavDocs, extra }) {
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
          {extra}
          <span className="fleepit-nav-link" onClick={onNavApp} style={linkStyle(active === "app")}>Research</span>
          <span className="fleepit-nav-link" onClick={onNavAlerts} style={linkStyle(active === "alerts")}>Alerts</span>
          <span className="fleepit-nav-link" onClick={onNavDocs} style={linkStyle(active === "docs")}>Docs</span>
        </div>

        <div className="fleepit-nav-desktop" style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "#9B9B9B", letterSpacing: "0.02em" }}>LIVE</span>
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
          {extra && <div style={{ display: "flex", flexDirection: "column" }}>{extra}</div>}
          <button onClick={go(onNavApp)} style={{ textAlign: "left", background: "none", border: "none", padding: "14px 4px", fontSize: 15, fontWeight: 500, color: active === "app" ? "#0A0A0A" : "#6B6B6B", borderTop: "1px solid rgba(0,0,0,0.06)" }}>Research</button>
          <button onClick={go(onNavAlerts)} style={{ textAlign: "left", background: "none", border: "none", padding: "14px 4px", fontSize: 15, fontWeight: 500, color: active === "alerts" ? "#0A0A0A" : "#6B6B6B", borderTop: "1px solid rgba(0,0,0,0.06)" }}>Alerts</button>
          <button onClick={go(onNavDocs)} style={{ textAlign: "left", background: "none", border: "none", padding: "14px 4px", fontSize: 15, fontWeight: 500, color: active === "docs" ? "#0A0A0A" : "#6B6B6B", borderTop: "1px solid rgba(0,0,0,0.06)" }}>Docs</button>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "14px 4px 4px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "#9B9B9B", letterSpacing: "0.02em" }}>LIVE</span>
          </div>
        </div>
      )}
    </>
  );
}
