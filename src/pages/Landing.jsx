import { useEffect, useState } from "react";
import FleepitLogo from "../components/layout/FleepitLogo";

const BRANDS = ["DeFiLlama", "CoinGecko", "xStocks", "Fluxion", "Mantle", "InsightX", "Bybit"];
const BRAND_FONTS = [
  { fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" },
  { fontFamily: "Arial, sans-serif", fontWeight: 900, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" },
  { fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: "0.01em", fontStyle: "italic" },
  { fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase" },
  { fontFamily: "Palatino, 'Book Antiqua', serif", fontWeight: 400, fontSize: 16, letterSpacing: "-0.01em" },
  { fontFamily: "Impact, 'Arial Narrow', sans-serif", fontWeight: 400, fontSize: 14, letterSpacing: "0.04em" },
  { fontFamily: "Verdana, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.03em" },
];
const PARTNER_FONTS = [
  { fontFamily: "'Times New Roman', serif", fontSize: 14, letterSpacing: "0.02em" },
  { fontFamily: "'Arial Black', sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase" },
  { fontFamily: "Impact, sans-serif", fontSize: 16, letterSpacing: "0.05em" },
  { fontFamily: "Georgia, serif", fontSize: 15, letterSpacing: "-0.02em" },
  { fontFamily: "Helvetica, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" },
  { fontFamily: "Verdana, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase" },
  { fontFamily: "Palatino, serif", fontSize: 15, letterSpacing: "0.03em" },
  { fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase" },
];
const PARTNERS = ["DeFiLlama", "CoinGecko", "Mantle", "xStocksFi", "Fluxion", "InsightX", "Bybit", "Aave"];

const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4";
const USECASE_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4";
const CARD1_IMG = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260423_164207_f243351d-ed59-48ec-83a0-a5e996bdbe3c.png&w=1280&q=85";

function ArrowRight({ color = "#0A0A0A", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MenuIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
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

export default function Landing({ onLaunch }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fleepit-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes fleepit-backers { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes fleepit-fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      .fleepit-marquee-track { display: flex; width: max-content; animation: fleepit-marquee 22s linear infinite; }
      .fleepit-backers-track { display: flex; width: max-content; animation: fleepit-backers 30s linear infinite; }
      .fleepit-nav-link { font-size: 14px; font-weight: 500; color: #6B6B6B; cursor: pointer; transition: color 0.2s; text-decoration: none; }
      .fleepit-nav-link:hover { color: #0A0A0A; }
      .fleepit-hero-btn:hover { background: #2A2A2A !important; }
      .fleepit-arrow-circle:hover { background: #E8E8E8 !important; }
      .fleepit-feature-card:hover { transform: translateY(-2px); transition: transform 0.25s ease; }
      .fleepit-footer-link:hover { color: white !important; }

      .fleepit-landing-nav { padding: 20px 28px; }
      .fleepit-hero-content { padding: 130px 52px 44px; }
      .fleepit-section-pad { padding: 96px 48px; }
      .fleepit-partners-pad { padding: 32px 48px 48px; }
      .fleepit-usecases-pad { padding: 80px 48px 96px; }
      .fleepit-footer-pad { padding: 52px 48px; }
      .fleepit-row-1-1 { grid-template-columns: 1fr 1fr; }
      .fleepit-row-2-1-1 { grid-template-columns: 2fr 1fr 1fr; }
      .fleepit-row-1-3 { grid-template-columns: 1fr 3fr; }
      .fleepit-nav-desktop { display: flex; }
      .fleepit-nav-burger { display: none; }

      @media (max-width: 900px) {
        .fleepit-row-2-1-1 { grid-template-columns: 1fr; }
      }
      @media (max-width: 768px) {
        .fleepit-row-1-1 { grid-template-columns: 1fr; gap: 28px !important; }
        .fleepit-row-1-3 { grid-template-columns: 1fr; gap: 20px !important; }
        .fleepit-usecases-pad > div { padding-right: 0 !important; }
        .fleepit-nav-desktop { display: none !important; }
        .fleepit-nav-burger { display: flex !important; }
      }
      @media (max-width: 640px) {
        .fleepit-landing-nav { padding: 16px 16px !important; }
        .fleepit-hero-content { padding: 96px 20px 32px !important; }
        .fleepit-section-pad { padding: 56px 20px !important; }
        .fleepit-partners-pad { padding: 24px 20px 32px !important; }
        .fleepit-usecases-pad { padding: 48px 20px 56px !important; }
        .fleepit-footer-pad { padding: 32px 20px !important; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <div style={{ background: "#F5F5F5", fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif", WebkitFontSmoothing: "antialiased", overflowX: "hidden" }}>

      {/* HERO */}
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        <nav className="fleepit-landing-nav" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FleepitLogo variant="light" size="md" />
          </div>
          <div className="fleepit-nav-desktop" style={{ alignItems: "center", gap: 36 }}>
            <a href="#research" className="fleepit-nav-link">Research</a>
            <a href="#capabilities" className="fleepit-nav-link">Capabilities</a>
            <a href="#usecases" className="fleepit-nav-link">Use Cases</a>
            <a href="#ecosystem" className="fleepit-nav-link">Ecosystem</a>
          </div>
          <button onClick={onLaunch} className="fleepit-nav-desktop fleepit-hero-btn" style={{ alignItems: "center", background: "#0A0A0A", color: "white", fontSize: 14, fontWeight: 500, padding: "10px 26px", borderRadius: 9999, cursor: "pointer", border: "none", letterSpacing: "-0.01em", transition: "background 0.2s" }}>
            Launch App
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="fleepit-nav-burger"
            aria-label="Menu"
            style={{ alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "rgba(255,255,255,0.6)", border: "none", borderRadius: 10, cursor: "pointer" }}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </nav>

        {menuOpen && (
          <div style={{ position: "absolute", top: 68, left: 16, right: 16, zIndex: 30, background: "white", borderRadius: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", padding: "8px 20px 20px", display: "flex", flexDirection: "column" }}>
            {[
              { href: "#research", label: "Research" },
              { href: "#capabilities", label: "Capabilities" },
              { href: "#usecases", label: "Use Cases" },
              { href: "#ecosystem", label: "Ecosystem" },
            ].map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ padding: "14px 4px", fontSize: 15, fontWeight: 500, color: "#3A3A3A", textDecoration: "none", borderTop: "1px solid rgba(0,0,0,0.06)" }}>{l.label}</a>
            ))}
            <button onClick={() => { setMenuOpen(false); onLaunch(); }} style={{ marginTop: 12, background: "#0A0A0A", color: "white", fontSize: 14, fontWeight: 500, padding: "12px 22px", borderRadius: 9999, border: "none", cursor: "pointer" }}>
              Launch App
            </button>
          </div>
        )}

        <div style={{ flex: 1, padding: "20px 20px 14px", display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "relative", width: "100%", borderRadius: 22, overflow: "hidden", height: "calc(100vh - 80px)", background: "#D8D5CE" }}>
            <video autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
              <source src={HERO_VIDEO} type="video/mp4" />
            </video>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(245,245,245,0.22) 0%, rgba(245,245,245,0.04) 100%)", zIndex: 1 }} />

            <div className="fleepit-hero-content" style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", height: "100%" }}>
              <div style={{ animation: "fleepit-fadeUp 0.7s ease both" }}>
                <h1 style={{ fontSize: "clamp(36px, 5.5vw, 72px)", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.02, color: "#0A0A0A", maxWidth: 640, marginBottom: 18 }}>
                  Your Research<br />Edge on Mantle.
                </h1>
                <p style={{ fontSize: "clamp(14px, 1.4vw, 18px)", color: "rgba(10,10,10,0.62)", maxWidth: 440, lineHeight: 1.65, fontWeight: 400, marginBottom: 34 }}>
                  An AI-native research agent built for the Mantle ecosystem. Tokens, pools, RWAs, protocols, all one question away.
                </p>
                <button onClick={onLaunch} style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#0A0A0A", color: "white", fontSize: 16, fontWeight: 500, padding: "10px 10px 10px 28px", borderRadius: 9999, cursor: "pointer", border: "none", letterSpacing: "-0.01em", marginBottom: 48, maxWidth: "100%" }} className="fleepit-hero-btn">
                  Start Researching
                  <span style={{ background: "white", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} className="fleepit-arrow-circle">
                    <ArrowRight />
                  </span>
                </button>
              </div>

              <div style={{ width: "100%", maxWidth: 580, overflow: "hidden" }}>
                <div className="fleepit-marquee-track">
                  {[...BRANDS, ...BRANDS].map((b, i) => (
                    <span key={i} style={{ margin: "0 28px", flexShrink: 0, color: "rgba(10,10,10,0.5)", whiteSpace: "nowrap", ...BRAND_FONTS[i % BRANDS.length] }}>{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INFO */}
      <section id="research" className="fleepit-section-pad" style={{ background: "#F5F5F5", maxWidth: 1408, margin: "0 auto" }}>
        <div className="fleepit-row-1-1" style={{ display: "grid", gap: 48, alignItems: "start", marginBottom: 52 }}>
          <div>
            <h2 style={{ fontSize: "clamp(30px, 3.8vw, 54px)", fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.06, color: "#0A0A0A", marginBottom: 28 }}>
              Meet Fleepit<br />Research Agent.
            </h2>
            <button onClick={onLaunch} style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#0A0A0A", color: "white", fontSize: 14, fontWeight: 500, padding: "9px 9px 9px 22px", borderRadius: 9999, cursor: "pointer", border: "none", letterSpacing: "-0.01em" }} className="fleepit-hero-btn">
              Explore it
              <span style={{ background: "white", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowRight size={13} />
              </span>
            </button>
          </div>
          <div>
            <p style={{ fontSize: "clamp(16px, 1.8vw, 26px)", color: "rgba(10,10,10,0.62)", lineHeight: 1.55, fontWeight: 400, maxWidth: 480 }}>
              Fleepit is an AI-native research agent that pulls live onchain data, reasons in visible steps, and delivers cited investment analysis for the Mantle ecosystem.
            </p>
          </div>
        </div>

        <div id="capabilities" className="fleepit-row-2-1-1" style={{ display: "grid", gap: 14 }}>
          <div className="fleepit-feature-card" style={{ borderRadius: 20, overflow: "hidden", minHeight: 280, backgroundImage: `url('${CARD1_IMG}')`, backgroundSize: "cover", backgroundPosition: "center", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 28 }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em", color: "#0A0A0A", lineHeight: 1.25, maxWidth: 220 }}>Research that works for you.</span>
            <span style={{ fontSize: 14, color: "rgba(10,10,10,0.62)", maxWidth: 280, lineHeight: 1.55 }}>Ask anything about tokens, pools, RWAs, protocols or investment scenarios. The agent pulls live data, reasons out loud, and shows every source.</span>
          </div>

          <div className="fleepit-feature-card" style={{ background: "#1A1A1A", borderRadius: 20, padding: 28, minHeight: 280, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.7)"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.025em", color: "white", lineHeight: 1.25, display: "block", marginBottom: 12 }}>Always live,<br />always cited.</span>
            </div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.6 }}>Every number traces to a live source. DeFiLlama, CoinGecko, and Mantle RPC. No hallucinated data.</span>
          </div>

          <div className="fleepit-feature-card" style={{ background: "#2B2644", borderRadius: 20, padding: 28, minHeight: 280, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 16l4-4 4 4 4-6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.025em", color: "white", lineHeight: 1.25, display: "block", marginBottom: 12 }}>Investment<br />scenarios.</span>
            </div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.6 }}>Ask "if I invest $1,000 for 6 months" and get a full projection table across all top Mantle pools.</span>
          </div>
        </div>
      </section>

      {/* DATA PARTNERS */}
      <section id="ecosystem" className="fleepit-partners-pad" style={{ background: "#F5F5F5" }}>
        <div className="fleepit-row-1-3" style={{ maxWidth: 1408, margin: "0 auto", display: "grid", gap: 48, alignItems: "center" }}>
          <p style={{ fontSize: 14, color: "rgba(10,10,10,0.52)", lineHeight: 1.65, fontWeight: 400 }}>
            Powered by live data from premier onchain data providers and the Mantle ecosystem.
          </p>
          <div style={{ overflow: "hidden" }}>
            <div className="fleepit-backers-track">
              {[...PARTNERS, ...PARTNERS].map((p, i) => (
                <span key={i} style={{ margin: "0 40px", flexShrink: 0, color: "rgba(10,10,10,0.4)", whiteSpace: "nowrap", ...PARTNER_FONTS[i % PARTNERS.length] }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="usecases" className="fleepit-usecases-pad" style={{ background: "#F5F5F5" }}>
        <div className="fleepit-row-1-1" style={{ maxWidth: 1408, margin: "0 auto", display: "grid", gap: 32, alignItems: "start" }}>
          <div style={{ paddingTop: 8, paddingRight: 40 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(10,10,10,0.42)", textTransform: "uppercase", marginBottom: 10 }}>Fleepit in Practice</p>
            <h2 style={{ fontSize: "clamp(32px, 4.5vw, 64px)", fontWeight: 600, letterSpacing: "-0.042em", lineHeight: 1.02, color: "#0A0A0A", marginBottom: 24 }}>Research<br />modes.</h2>
            <p style={{ fontSize: 15, color: "rgba(10,10,10,0.52)", lineHeight: 1.7, maxWidth: 340, fontWeight: 400 }}>
              Fleepit powers deep research for DeFi investors, protocol analysts, and onchain builders who need answers fast, not dashboards to decode.
            </p>
          </div>

          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", minHeight: 420, backgroundColor: "#1a1a1a" }}>
            <video autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
              <source src={USECASE_VIDEO} type="video/mp4" />
            </video>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)", zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 10, padding: "40px 28px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <h3 style={{ fontSize: "clamp(28px, 3.2vw, 48px)", fontWeight: 600, letterSpacing: "-0.032em", color: "white", lineHeight: 1.1, marginBottom: 14 }}>DeFi Investor.</h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.68)", maxWidth: 380, lineHeight: 1.65, marginBottom: 28, fontWeight: 400 }}>
                Find the highest sustainable yield, model an investment scenario, and get a sourced recommendation before you deploy a single dollar, all in one question.
              </p>
              <button onClick={onLaunch} style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "white", fontSize: 15, fontWeight: 500, cursor: "pointer", background: "none", border: "none", width: "fit-content", padding: 0 }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ArrowRight color="white" size={14} />
                </span>
                Try it now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="fleepit-footer-pad" style={{ background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FleepitLogo variant="dark" size="sm" />
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", fontWeight: 400, textAlign: "center" }}>
          AI-native research agent for the Mantle ecosystem. Built for the Mantle Research Challenge 2026.
        </p>
        <button onClick={onLaunch} className="fleepit-footer-link" style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}>
          Launch App →
        </button>
      </footer>
    </div>
  );
}
