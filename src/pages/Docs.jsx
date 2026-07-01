import AppNav from "../components/layout/AppNav";

const BLACK = "#0A0A0A";
const GRAY = "#9B9B9B";

const TOOLS = [
  { name: "get_mantle_tokens", desc: "Top tokens in the Mantle ecosystem by market cap, price change, or volume.", source: "CoinGecko" },
  { name: "get_mantle_protocols", desc: "DeFi protocols deployed on Mantle, ranked by TVL, with 7d and 30d change.", source: "DeFiLlama" },
  { name: "list_mantle_pools", desc: "Live yield and staking pools on Mantle, filterable by risk, TVL, and stablecoin status.", source: "DeFiLlama Yields" },
  { name: "get_pool_details", desc: "Look up a specific pool by protocol or symbol name.", source: "DeFiLlama Yields" },
  { name: "get_pool_history", desc: "30 day APY and TVL history for a pool, used to catch unsustainable yield.", source: "DeFiLlama Yields" },
  { name: "get_token_price_history", desc: "7, 14, or 30 day price history for a token, used for trend and timing questions.", source: "CoinGecko" },
  { name: "get_mantle_chain_metrics", desc: "Chain level TVL, 7d and 30d change, rank among chains, and MNT price.", source: "DeFiLlama + CoinGecko" },
  { name: "compare_assets", desc: "Resolves and aligns 2 to 5 tokens or pools for side by side comparison.", source: "CoinGecko + DeFiLlama" },
];

const STEPS = [
  { title: "You ask a question", desc: "In plain English. Tokens, pools, protocols, chain health, or an investment scenario." },
  { title: "The agent plans and calls tools", desc: "Groq's Llama 3.3 70B model decides which live data it needs, then calls one or more tools above." },
  { title: "Every result is real", desc: "Each tool hits a live API. Nothing is invented. Numbers you see trace directly to DeFiLlama or CoinGecko." },
  { title: "It reasons and answers", desc: "The model synthesizes what it found into a decisive, cited answer, shown alongside the table, chart, and sources it used." },
];

function Section({ id, label, children }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: GRAY, textTransform: "uppercase", marginBottom: 14 }}>{label}</div>
      {children}
    </section>
  );
}

export default function Docs({ onHome, onNavApp, onNavAlerts }) {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", background: "#F5F5F5", color: BLACK }}>
      <AppNav active="docs" onHome={onHome} onNavApp={onNavApp} onNavAlerts={onNavAlerts} onNavDocs={() => {}} />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "112px 44px 100px" }}>
        <h1 style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.08, color: BLACK, marginBottom: 16 }}>
          How Fleepit works.
        </h1>
        <p style={{ fontSize: 16, color: "#7A7A7A", lineHeight: 1.65, fontWeight: 400, marginBottom: 56, maxWidth: 560 }}>
          Fleepit is an AI native research agent for the Mantle ecosystem. This page explains what it is built from and how a question turns into a cited answer.
        </p>

        <Section id="what-it-is" label="What it is">
          <p style={{ fontSize: 15, color: "#3A3A3A", lineHeight: 1.75, marginBottom: 14 }}>
            Fleepit is not a dashboard with an AI button bolted on. It is a multi step, tool using agent built on Groq's Llama 3.3 70B model. When you ask a question, the model decides which live data sources to query, reads the results, and can call more tools before writing a final answer.
          </p>
          <p style={{ fontSize: 15, color: "#3A3A3A", lineHeight: 1.75 }}>
            It covers the full Mantle ecosystem: tokens, DeFi protocols, yield pools, chain health, and investment scenarios, not just one data type.
          </p>
        </Section>

        <Section id="how-it-works" label="How a question becomes an answer">
          <div style={{ display: "grid", gap: 12 }}>
            {STEPS.map((s, i) => (
              <div key={s.title} style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", padding: 18, display: "flex", gap: 16 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: BLACK, color: "white", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: BLACK, marginBottom: 4 }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: "#7A7A7A", lineHeight: 1.55 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="tools" label="Research tools">
          <p style={{ fontSize: 14, color: "#7A7A7A", lineHeight: 1.65, marginBottom: 18 }}>
            These are the live tools the agent can call. Every one hits a real API at query time. None are cached mock responses.
          </p>
          <div style={{ background: "white", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {TOOLS.map((t, i) => (
              <div key={t.name} style={{ padding: "16px 20px", borderBottom: i < TOOLS.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: BLACK, fontFamily: "ui-monospace, monospace" }}>{t.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: GRAY }}>{t.source}</span>
                </div>
                <p style={{ fontSize: 13, color: "#7A7A7A", lineHeight: 1.5 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="skill" label="Run it yourself">
          <p style={{ fontSize: 15, color: "#3A3A3A", lineHeight: 1.75, marginBottom: 12 }}>
            The same research capability is packaged as an open Agent Skill under <code style={{ fontFamily: "ui-monospace, monospace", background: "#F0F0F0", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>skills/mantle-yield-research</code> in the repository. It follows the open SKILL.md standard, so any agent runtime that supports Agent Skills, including Claude Code, can load and run it directly.
          </p>
        </Section>

        <Section id="alerts" label="Alerts">
          <p style={{ fontSize: 15, color: "#3A3A3A", lineHeight: 1.75 }}>
            Fleepit also runs a Telegram bot that watches Mantle pools on a schedule and messages subscribers when yields spike or new pools appear. See the Alerts page to subscribe.
          </p>
        </Section>
      </div>
    </div>
  );
}
