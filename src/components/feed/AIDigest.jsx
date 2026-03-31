import { useState } from "react";
import { Sparkles, AlertTriangle, Settings, RefreshCw } from "lucide-react";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export default function AIDigest({ geminiKey, articles, onOpenSettings }) {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState(null);

  const generate = async () => {
    if (!geminiKey || loading) return;

    setLoading(true);
    setError(null);

    const headlines = articles
      .slice(0, 8)
      .map((a, i) => {
        const desc = a.description?.replace(/<[^>]*>/g, "").slice(0, 120) || "";
        return `${i + 1}. ${a.title}${desc ? ` — ${desc}` : ""}`;
      })
      .join("\n");

    const prompt = `You are a DeFi intelligence analyst covering the Mantle blockchain ecosystem.

Based on these recent news headlines, produce a concise ecosystem briefing for a DeFi investor:

${headlines}

Structure your briefing with these three points:
1. **What's happening on Mantle today** — key developments in 2-3 sentences
2. **Notable opportunities or risks** — anything actionable in 2-3 sentences
3. **One key thing to watch** — the most important upcoming catalyst or risk to monitor

Keep the entire briefing under 200 words. Be specific, data-aware, and forward-looking.`;

    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${geminiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 350,
          temperature: 0.5,
        }),
      });
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error(json.error?.message || "No response from AI.");
      setDigest(text);
      setTimestamp(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-navy/10 flex items-center justify-center">
          <Sparkles size={14} className="text-navy" />
        </div>
        <h3 className="font-semibold text-navy text-sm">AI Ecosystem Briefing</h3>
      </div>

      {!geminiKey ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-xs text-amber-700 mb-2">
            Add your Gemini API key to generate AI briefings.
          </p>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 mx-auto text-xs font-medium text-navy hover:underline"
          >
            <Settings size={12} />
            Open Settings
          </button>
        </div>
      ) : !digest ? (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            Generate a real-time AI briefing based on the latest Mantle ecosystem news.
          </p>
          <button
            onClick={generate}
            disabled={loading || articles.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate AI Briefing
              </>
            )}
          </button>
          {articles.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-2">Loading news feed first...</p>
          )}
        </div>
      ) : (
        <div>
          <div className="prose prose-sm max-w-none">
            {digest.split("\n").map((line, i) => {
              if (!line.trim()) return null;
              const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");
              const isBold = line.startsWith("**") || /^\d+\./.test(line);
              return (
                <p
                  key={i}
                  className={`text-xs leading-relaxed mb-2 ${
                    isBold ? "font-semibold text-navy" : "text-gray-700"
                  }`}
                >
                  {cleaned}
                </p>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Generated at {timestamp}</span>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-navy font-medium hover:underline"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} className="text-red-500" />
            <span className="text-xs font-semibold text-red-600">Error</span>
          </div>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
