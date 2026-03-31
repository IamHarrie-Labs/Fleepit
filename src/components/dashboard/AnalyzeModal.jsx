import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles, AlertTriangle, CheckCircle2, Calculator } from "lucide-react";
import { formatTVL, classifyRisk } from "./PoolCard";
import { GEMINI_API_KEY } from "../../config";
import { sendTelegramAlert } from "../../utils/telegram";
import { cn } from "../../lib/utils";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const PERIOD_DAYS = { "1W": 7, "1M": 30, "3M": 91, "6M": 182, "1Y": 365 };

function parseAnalysis(text) {
  const sections = { summary: "", riskFlag: "", verdict: "" };
  const summaryMatch = text.match(/(?:Opportunity Summary|Summary)[:\s*]*\n?([\s\S]*?)(?=\n\s*\*?\*?Risk Flag|\n\s*\*?\*?Verdict|$)/i);
  const riskMatch = text.match(/(?:Risk Flag|Risks?)[:\s*]*\n?([\s\S]*?)(?=\n\s*\*?\*?Verdict|\n\s*\*?\*?Summary|$)/i);
  const verdictMatch = text.match(/(?:Verdict)[:\s*]*\n?([\s\S]*?)$/i);
  sections.summary = summaryMatch?.[1]?.trim() || text.split("\n\n")[0] || "";
  sections.riskFlag = riskMatch?.[1]?.trim() || text.split("\n\n")[1] || "";
  sections.verdict = verdictMatch?.[1]?.trim() || text.split("\n\n")[2] || "";
  return sections;
}

export default function AnalyzeModal({ pool, onClose }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [principal, setPrincipal] = useState("");
  const [period, setPeriod] = useState("1M");

  useEffect(() => {
    if (!pool) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setPrincipal("");
    setPeriod("1M");

    const risk = classifyRisk(pool);
    const prompt = `You are a DeFi analyst specializing in the Mantle blockchain ecosystem.

Analyze this yield pool:
- Protocol: ${pool.project}
- Token/Pool: ${pool.symbol}
- APY: ${(pool.apy ?? 0).toFixed(2)}%
- TVL: ${formatTVL(pool.tvlUsd)}
- IL Risk: ${pool.ilRisk ?? "unknown"}
- Risk Category: ${risk}

Provide a structured analysis with exactly these three sections:

**Opportunity Summary**
[2-3 sentences on what this pool offers and why it may be attractive]

**Risk Flag**
[2-3 sentences on the key risks: IL, smart contract, protocol, market risk]

**Verdict**
[1-2 sentences: is this suitable for conservative, balanced, or aggressive investors? Give a clear recommendation]

Be concise, data-driven, and specific to Mantle ecosystem context.`;

    fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.4,
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        const text = json.choices?.[0]?.message?.content;
        if (!text) throw new Error(json.error?.message || "No response from AI.");
        const parsed = parseAnalysis(text);
        setResponse(parsed);
        // Fire Telegram alert with pool name and verdict (to user's own Chat ID if set)
        const userChatId = localStorage.getItem("fleepit_telegram_chat_id") || undefined;
        sendTelegramAlert(
          `🔍 *Fleepit AI Analysis*\n\n*Pool:* ${pool.symbol} (${pool.project})\n*APY:* ${(pool.apy ?? 0).toFixed(2)}%\n*TVL:* ${formatTVL(pool.tvlUsd)}\n\n*Verdict:* ${parsed.verdict}`,
          userChatId
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pool]);

  const risk = pool ? classifyRisk(pool) : "low";
  const riskColors = {
    low: "text-emerald-600",
    medium: "text-amber-600",
    high: "text-red-600",
  };

  return (
    <Dialog.Root open={!!pool} onOpenChange={() => onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
          {pool && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} className="text-navy" />
                    <span className="text-xs font-semibold text-navy/60 uppercase tracking-wider">
                      AI Analysis
                    </span>
                  </div>
                  <Dialog.Title className="text-lg font-bold text-navy">
                    {pool.symbol}
                  </Dialog.Title>
                  <p className="text-sm text-gray-500">{pool.project} · {(pool.apy ?? 0).toFixed(2)}% APY</p>
                </div>
                <Dialog.Close asChild>
                  <button className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-400">
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>

              {/* Body */}
              <div className="p-6">
                {loading && (
                  <div className="space-y-4">
                    {["Opportunity Summary", "Risk Flag", "Verdict"].map((title) => (
                      <div key={title} className="rounded-xl bg-gray-50 p-4 animate-pulse">
                        <div className="h-3 w-32 bg-gray-200 rounded mb-3" />
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-full" />
                          <div className="h-3 bg-gray-200 rounded w-5/6" />
                          <div className="h-3 bg-gray-200 rounded w-4/6" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                    <AlertTriangle size={20} className="text-red-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-red-700 mb-1">Analysis Failed</p>
                    <p className="text-xs text-red-500">{error}</p>
                  </div>
                )}

                {response && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
                        Opportunity Summary
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">{response.summary}</p>
                    </div>
                    <div className={`rounded-xl p-4 ${risk === "high" ? "bg-red-50 border border-red-100" : risk === "medium" ? "bg-amber-50 border border-amber-100" : "bg-emerald-50 border border-emerald-100"}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${riskColors[risk]}`}>
                        Risk Flag
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">{response.riskFlag}</p>
                    </div>
                    <div className="rounded-xl bg-navy/5 border border-navy/10 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 size={14} className="text-navy" />
                        <p className="text-xs font-bold text-navy uppercase tracking-wider">
                          Verdict
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed font-medium">{response.verdict}</p>
                    </div>

                    {/* ── Earnings Calculator ── */}
                    {(() => {
                      const principalNum = parseFloat(principal) || 0;
                      const days = PERIOD_DAYS[period];
                      const apy = pool?.apy ?? 0;
                      const earnings = principalNum * (apy / 100) * (days / 365);
                      const finalValue = principalNum + earnings;
                      const dailyRate = apy / 100 / 365;
                      return (
                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                          <div className="flex items-center gap-1.5 mb-3">
                            <Calculator size={14} className="text-navy/70" />
                            <p className="text-xs font-bold text-navy/70 uppercase tracking-wider">
                              Earnings Calculator
                            </p>
                          </div>
                          {/* Principal input */}
                          <div className="mb-3">
                            <label className="text-xs text-gray-500 mb-1 block">Principal (USD)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                type="number"
                                min="0"
                                value={principal}
                                onChange={(e) => setPrincipal(e.target.value)}
                                placeholder="1000"
                                className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white"
                              />
                            </div>
                          </div>
                          {/* Period pills */}
                          <div className="flex gap-1.5 mb-4">
                            {Object.keys(PERIOD_DAYS).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                                  period === p
                                    ? "bg-navy text-white border-navy"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-navy/30"
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          {/* Results */}
                          {principalNum > 0 ? (
                            <div className="rounded-lg bg-white border border-gray-100 p-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Projected Earnings</span>
                                <span className="text-sm font-bold text-emerald-600">+${earnings.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Final Value</span>
                                <span className="text-sm font-semibold text-gray-800">${finalValue.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                                <span className="text-xs text-gray-400">Daily Rate</span>
                                <span className="text-xs text-gray-500">{(dailyRate * 100).toFixed(4)}% / day</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 text-center py-1">Enter a principal amount to see projections</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
