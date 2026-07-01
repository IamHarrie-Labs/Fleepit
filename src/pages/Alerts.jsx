import { useState, useEffect } from "react";
import AppNav from "../components/layout/AppNav";
import { TELEGRAM_BOT_USERNAME } from "../config";

const BLACK = "#0A0A0A";
const GREEN = "#0D9E6E";
const GRAY = "#9B9B9B";

const ALERT_TYPES = [
  { title: "Twice daily yield brief", detail: "Top Mantle pools with AI verdicts, sent every morning and evening." },
  { title: "New pool notifications", detail: "The moment a new Mantle pool appears on DeFiLlama." },
  { title: "APY surge alerts", detail: "Fires when a pool's APY jumps 25% or more since the last check." },
];

const STEPS = [
  { n: "1", text: "Open Telegram and search for your Fleepit bot." },
  { n: "2", text: "Press Start, or send /start directly." },
  { n: "3", text: "You're subscribed. Send /stop anytime to leave, or /status to check." },
];

export default function Alerts({ onHome, onNavApp }) {
  const [count, setCount] = useState(null);
  const [configured, setConfigured] = useState(null);

  useEffect(() => {
    fetch("/api/subscriber-count")
      .then((r) => r.json())
      .then((d) => { setCount(d.count ?? 0); setConfigured(!!d.configured); })
      .catch(() => { setCount(0); setConfigured(false); });
  }, []);

  const botHandle = TELEGRAM_BOT_USERNAME ? `@${TELEGRAM_BOT_USERNAME}` : null;
  const botLink = TELEGRAM_BOT_USERNAME ? `https://t.me/${TELEGRAM_BOT_USERNAME}` : null;

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", background: "#F5F5F5", color: BLACK }}>
      <AppNav active="alerts" onHome={onHome} onNavApp={onNavApp} onNavAlerts={() => {}} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "112px 44px 80px" }}>
        <h1 style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.08, color: BLACK, marginBottom: 16 }}>
          Mantle alerts on Telegram.
        </h1>
        <p style={{ fontSize: 16, color: "#7A7A7A", lineHeight: 1.65, fontWeight: 400, marginBottom: 40, maxWidth: 520 }}>
          Fleepit runs a live Telegram bot that watches Mantle pools around the clock and messages you when something changes.
        </p>

        {/* Live subscriber count */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN }} />
          {count === null ? (
            <span style={{ fontSize: 13, color: GRAY }}>Checking subscriber count...</span>
          ) : configured ? (
            <span style={{ fontSize: 13, color: GRAY }}>{count} live subscriber{count === 1 ? "" : "s"} right now</span>
          ) : (
            <span style={{ fontSize: 13, color: GRAY }}>Subscriber storage is not configured yet</span>
          )}
        </div>

        {/* How to subscribe */}
        <div style={{ background: "white", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: 28, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", color: GRAY, textTransform: "uppercase", marginBottom: 20 }}>How to subscribe</div>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 16, marginBottom: 18, alignItems: "flex-start" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: BLACK, color: "white", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
              <p style={{ fontSize: 14, color: "#3A3A3A", lineHeight: 1.6, paddingTop: 2 }}>{s.text}</p>
            </div>
          ))}

          {botLink ? (
            <a href={botLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: BLACK, color: "white", fontSize: 14, fontWeight: 500, padding: "11px 24px", borderRadius: 9999, textDecoration: "none", marginTop: 8 }}>
              Open {botHandle} on Telegram
            </a>
          ) : (
            <p style={{ fontSize: 13, color: GRAY, marginTop: 8 }}>
              Set VITE_TELEGRAM_BOT_USERNAME in your environment to show a direct link here.
            </p>
          )}
        </div>

        {/* What you get */}
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.09em", color: GRAY, textTransform: "uppercase", marginBottom: 14 }}>What you will receive</div>
        <div style={{ display: "grid", gap: 12, marginBottom: 8 }}>
          {ALERT_TYPES.map((a) => (
            <div key={a.title} style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", padding: 18 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: BLACK, marginBottom: 4 }}>{a.title}</p>
              <p style={{ fontSize: 13, color: "#7A7A7A", lineHeight: 1.55 }}>{a.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
