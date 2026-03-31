import { useState, useEffect, useRef } from "react";
import { Sparkles, RefreshCw, ExternalLink, AlertCircle, Clock, Zap, Radio } from "lucide-react";
import { GEMINI_API_KEY } from "../config";
import { sendTelegramAlert } from "../utils/telegram";
import { useXPosts } from "../hooks/useXPosts";
import { formatTVL } from "../components/dashboard/PoolCard";
import { cn } from "../lib/utils";

const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL  = "llama-3.3-70b-versatile";
const REFRESH_MS  = 5 * 60 * 1000;
const BRIEFING_TTL_MS = 2 * 60 * 60 * 1000;

// ── CORS proxy with fallback ──────────────────────────────────────────────────
const PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
];

async function proxyFetch(url) {
  for (const make of PROXIES) {
    try {
      const r = await fetch(make(url), { cache: "no-store" });
      if (r.ok) return await r.text();
    } catch { /* try next */ }
  }
  return null;
}

// ── Source registry ───────────────────────────────────────────────────────────
// mantle:true  → every item is Mantle-relevant by design (no keyword check)
// mantle:false → keyword-filtered — only Mantle mentions pass through
const SOURCES = [

  // ── Mantle official ─────────────────────────────────────────────────────────
  {
    url: "https://www.mantle.xyz/blog/rss.xml",
    sourceLabel: "Mantle Blog", type: "blog",
    avatar: "https://www.mantle.xyz/favicon.ico", fallbackAvatar: "M",
    mantle: true,
  },
  {
    url: "https://mantlenetwork.medium.com/feed",
    sourceLabel: "Mantle Medium", type: "blog",
    avatar: "https://miro.medium.com/v2/resize:fill:88:88/1*sHhtYhaCe2Uc3IU0IgKwIQ.png",
    fallbackAvatar: "M", mantle: true,
  },

  // ── Google News (aggregates from hundreds of publishers — always live) ───────
  {
    url: "https://news.google.com/rss/search?q=mantle+blockchain&hl=en-US&gl=US&ceid=US:en",
    sourceLabel: "Google News", type: "media",
    avatar: "https://www.google.com/favicon.ico", fallbackAvatar: "G",
    mantle: true,
  },
  {
    url: "https://news.google.com/rss/search?q=%22mantle+network%22+OR+%22MNT+token%22&hl=en-US&gl=US&ceid=US:en",
    sourceLabel: "Google News", type: "media",
    avatar: "https://www.google.com/favicon.ico", fallbackAvatar: "G",
    mantle: true,
  },
  {
    url: "https://news.google.com/rss/search?q=mETH+protocol+OR+FBTC+mantle+OR+%22agni+finance%22&hl=en-US&gl=US&ceid=US:en",
    sourceLabel: "Google News", type: "media",
    avatar: "https://www.google.com/favicon.ico", fallbackAvatar: "G",
    mantle: true,
  },

  // ── Research firms ───────────────────────────────────────────────────────────
  {
    url: "https://blockworks.co/feed",
    sourceLabel: "Blockworks", type: "media",
    avatar: "https://blockworks.co/favicon.ico", fallbackAvatar: "BW",
    mantle: false,
  },
  {
    url: "https://www.dlnews.com/rss/",
    sourceLabel: "DL News", type: "media",
    avatar: "https://www.dlnews.com/favicon.ico", fallbackAvatar: "DL",
    mantle: false,
  },
  {
    url: "https://cryptobriefing.com/feed/",
    sourceLabel: "Crypto Briefing", type: "media",
    avatar: "https://cryptobriefing.com/favicon.ico", fallbackAvatar: "CB",
    mantle: false,
  },
  {
    url: "https://beincrypto.com/feed/",
    sourceLabel: "BeInCrypto", type: "media",
    avatar: "https://beincrypto.com/favicon.ico", fallbackAvatar: "BC",
    mantle: false,
  },
  {
    url: "https://protos.com/feed/",
    sourceLabel: "Protos", type: "media",
    avatar: "https://protos.com/favicon.ico", fallbackAvatar: "PR",
    mantle: false,
  },

  // ── Newsletters & Substacks ──────────────────────────────────────────────────
  {
    url: "https://newsletter.banklesshq.com/feed",
    sourceLabel: "Bankless", type: "newsletter",
    avatar: "https://banklesshq.com/favicon.ico", fallbackAvatar: "BL",
    mantle: false,
  },
  {
    url: "https://thedefiant.io/feed",
    sourceLabel: "The Defiant", type: "newsletter",
    avatar: "https://thedefiant.io/favicon.ico", fallbackAvatar: "TD",
    mantle: false,
  },
  {
    url: "https://thedefiedge.substack.com/feed",
    sourceLabel: "DeFi Edge", type: "newsletter",
    avatar: "https://substack.com/favicon.ico", fallbackAvatar: "DE",
    mantle: false,
  },
  {
    url: "https://doseofdefi.substack.com/feed",
    sourceLabel: "Dose of DeFi", type: "newsletter",
    avatar: "https://substack.com/favicon.ico", fallbackAvatar: "DD",
    mantle: false,
  },
  {
    url: "https://milkroad.com/rss",
    sourceLabel: "Milk Road", type: "newsletter",
    avatar: "https://milkroad.com/favicon.ico", fallbackAvatar: "MR",
    mantle: false,
  },
  {
    url: "https://unchainedcrypto.com/feed/",
    sourceLabel: "Unchained", type: "newsletter",
    avatar: "https://unchainedcrypto.com/favicon.ico", fallbackAvatar: "UC",
    mantle: false,
  },
  {
    url: "https://route2fi.substack.com/feed",
    sourceLabel: "Route 2 FI", type: "newsletter",
    avatar: "https://substack.com/favicon.ico", fallbackAvatar: "R2",
    mantle: false,
  },

  // ── Major crypto media ───────────────────────────────────────────────────────
  {
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    sourceLabel: "CoinDesk", type: "media",
    avatar: "https://www.coindesk.com/favicon.ico", fallbackAvatar: "C",
    mantle: false,
  },
  {
    url: "https://www.theblock.co/rss.xml",
    sourceLabel: "The Block", type: "media",
    avatar: "https://www.theblock.co/favicon.ico", fallbackAvatar: "T",
    mantle: false,
  },
  {
    url: "https://cointelegraph.com/rss",
    sourceLabel: "Cointelegraph", type: "media",
    avatar: "https://cointelegraph.com/favicon.ico", fallbackAvatar: "CT",
    mantle: false,
  },
  {
    url: "https://decrypt.co/feed",
    sourceLabel: "Decrypt", type: "media",
    avatar: "https://decrypt.co/favicon.ico", fallbackAvatar: "D",
    mantle: false,
  },
  {
    url: "https://blog.coingecko.com/feed/",
    sourceLabel: "CoinGecko", type: "media",
    avatar: "https://www.coingecko.com/favicon.ico", fallbackAvatar: "CG",
    mantle: false,
  },
];

// ── Keyword filter — broad enough to catch protocol mentions ──────────────────
const KEYWORDS = [
  "mantle", " mnt ", "$mnt", "meth protocol", "fbtc",
  "mantle network", "mantle defi", "mantle ecosystem", "mantle l2",
  "lendle", "agni finance", "merchant moe", "init capital",
  "treehouse", "meth staking", "mantle lsp",
];

function isRelevant(item) {
  const hay = ` ${item.title || ""} ${item.description || ""} `.toLowerCase();
  return KEYWORDS.some((kw) => hay.includes(kw));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim() || "";
}

function relativeTime(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1)  return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7)  return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

// ── RSS XML parser ────────────────────────────────────────────────────────────
function parseRssXml(xmlText) {
  try {
    const doc   = new DOMParser().parseFromString(xmlText, "application/xml");
    const items = [...doc.querySelectorAll("item")];
    return items.map((item) => {
      // <link> can be a text node sibling in some parsers
      let link = item.querySelector("link")?.textContent?.trim()
              || item.querySelector("link")?.nextSibling?.nodeValue?.trim()
              || "";
      if (!link) {
        const guid = item.querySelector("guid")?.textContent?.trim();
        if (guid?.startsWith("http")) link = guid;
      }
      const sourceEl = item.querySelector("source");
      return {
        title:       item.querySelector("title")?.textContent?.trim()       || "",
        link,
        description: item.querySelector("description")?.textContent?.trim() || "",
        pubDate:     item.querySelector("pubDate")?.textContent?.trim()      || "",
        guid:        item.querySelector("guid")?.textContent?.trim()         || "",
        sourceLabel: sourceEl?.textContent?.trim()                           || "",
      };
    });
  } catch { return []; }
}

// ── Onchain events → feed items ───────────────────────────────────────────────
function eventsToFeedItems(events = []) {
  return events.map((evt) => {
    if (evt.type === "new-pool") return {
      id: `onchain-new-${evt.pool.pool}`,
      type: "onchain",
      sourceLabel: "New Pool Radar", avatar: null, fallbackAvatar: "🆕",
      title: `New Pool: ${evt.pool.symbol} on ${evt.pool.project} — ${(evt.pool.apy ?? 0).toFixed(2)}% APY`,
      excerpt: `A new yield pool just appeared on Mantle. TVL: ${formatTVL(evt.pool.tvlUsd)}. Early entrants often benefit from higher initial incentives before liquidity normalises.`,
      timestamp: evt.timestamp, link: null, urgent: false,
    };
    if (evt.type === "apy-surge") return {
      id: `onchain-surge-${evt.pool.pool}`,
      type: "onchain",
      sourceLabel: "APY Drift Alert", avatar: null, fallbackAvatar: "⚡",
      title: `APY Surge: ${evt.pool.symbol} (${evt.pool.project}) — ${evt.prevApy.toFixed(1)}% → ${evt.currApy.toFixed(1)}% (+${evt.changePct}%)`,
      excerpt: `A sudden ${evt.changePct}% APY jump may signal a new liquidity incentive campaign. High APY spikes often normalise within 24–48h — act quickly or wait for confirmation.`,
      timestamp: evt.timestamp, link: null, urgent: true,
    };
    return null;
  }).filter(Boolean);
}

// ── RSS feed hook ─────────────────────────────────────────────────────────────
function useRssItems() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const manualRefresh = () => { setLoading(true); setRefreshTick((t) => t + 1); };

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled(
          SOURCES.map(async (src) => {
            const xml = await proxyFetch(src.url);
            if (!xml) return { src, parsed: [] };
            return { src, parsed: parseRssXml(xml) };
          })
        );

        if (cancelled) return;

        const seen   = new Set();
        const merged = [];

        results.forEach((res) => {
          if (res.status !== "fulfilled") return;
          const { src, parsed } = res.value;

          parsed.forEach((item) => {
            if (!src.mantle && !isRelevant(item)) return;

            const key = item.title?.toLowerCase().slice(0, 70);
            if (!key || seen.has(key)) return;
            seen.add(key);

            const label = item.sourceLabel || src.sourceLabel;

            merged.push({
              id:            `rss-${src.sourceLabel}-${item.guid || item.link || item.title}`,
              type:          src.type,
              sourceLabel:   label,
              avatar:        src.avatar,
              fallbackAvatar:src.fallbackAvatar,
              title:         item.title,
              excerpt:       stripHtml(item.description).slice(0, 220),
              timestamp:     item.pubDate,
              link:          item.link,
              urgent:        false,
            });
          });
        });

        merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (!cancelled) {
          setItems(merged.slice(0, 60));
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [refreshTick]);

  return { items, loading, error, lastUpdated, manualRefresh };
}

// ── Combined feed hook ────────────────────────────────────────────────────────
function useFeedItems(onchainEvents = []) {
  const { items: rssItems, loading: rssLoading, error, lastUpdated, manualRefresh } = useRssItems();
  const { posts: xPosts, loading: xLoading } = useXPosts();

  const loading = rssLoading || xLoading;

  const onchainItems = eventsToFeedItems(onchainEvents);

  // Single flat list — no sections, sorted purely by recency
  const allItems = [...onchainItems, ...rssItems, ...xPosts]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { allItems, loading, error, lastUpdated, manualRefresh };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex gap-2 mb-2.5">
            <div className="h-4 w-24 bg-gray-200 rounded-full" />
            <div className="h-4 w-16 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 bg-gray-200 rounded mb-1.5 w-full" />
          <div className="h-4 bg-gray-200 rounded mb-1.5 w-5/6" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, fallback, alt }) {
  const [failed, setFailed] = useState(false);
  const isEmoji = typeof fallback === "string" && /\p{Emoji}/u.test(fallback);
  if (failed || !src) {
    return (
      <div className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold select-none",
        isEmoji ? "bg-navy/8 text-lg" : "bg-navy text-white"
      )}>
        {fallback}
      </div>
    );
  }
  return (
    <img src={src} alt={alt}
      className="w-11 h-11 rounded-full object-cover flex-shrink-0 bg-gray-100 border border-gray-200"
      onError={() => setFailed(true)}
    />
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────
const BADGE_CFG = {
  blog:       { label: "Blog",       style: "bg-indigo-50 text-indigo-700"  },
  x:          { label: "X Post",     style: "bg-sky-50 text-sky-700"        },
  media:      { label: "Media",      style: "bg-navy/5 text-navy"           },
  onchain:    { label: "On-Chain",   style: "bg-emerald-50 text-emerald-700"},
  newsletter: { label: "Newsletter", style: "bg-violet-50 text-violet-700"  },
};

function TypeBadge({ type }) {
  const cfg = BADGE_CFG[type] || { label: type, style: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", cfg.style)}>
      {cfg.label}
    </span>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────────
function FeedCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const isX     = item.type === "x";
  const content = isX ? item.content : item.excerpt;
  const isLong  = content && content.length > 180;

  return (
    <div className={cn(
      "bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-all",
      item.urgent
        ? "border-amber-200 hover:border-amber-300"
        : "border-gray-100 hover:border-navy/25",
    )}>
      {item.urgent && (
        <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-amber-600">
          <Zap size={12} /> APY Drift Detected
        </div>
      )}
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <Avatar
            src={item.avatar}
            fallback={item.fallbackAvatar || item.sourceLabel?.[0]}
            alt={isX ? item.author : item.sourceLabel}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm font-semibold text-navy truncate">
              {isX ? item.author : item.sourceLabel}
            </span>
            {isX && <span className="text-xs text-gray-400">@{item.handle}</span>}
            <TypeBadge type={item.type} />
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto flex-shrink-0">
              <Clock size={11} /> {relativeTime(item.timestamp)}
            </span>
          </div>

          {isX ? (
            <p className={cn("text-sm text-gray-800 leading-relaxed whitespace-pre-line", !expanded && "line-clamp-3")}>
              {item.content}
            </p>
          ) : (
            <a href={item.link || "#"} target={item.link ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="block text-sm font-semibold text-gray-900 hover:text-navy leading-snug mb-1 line-clamp-2">
              {item.title}
            </a>
          )}

          {!isX && content && (
            <p className={cn("text-xs text-gray-500 leading-relaxed mt-1", !expanded && "line-clamp-2")}>
              {content}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2.5">
            {isLong && (
              <button onClick={() => setExpanded(!expanded)}
                className="text-xs text-navy font-medium hover:underline">
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
            {isX ? (
              <a href={item.profileUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy transition-colors ml-auto">
                View on X <ExternalLink size={11} />
              </a>
            ) : item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-navy font-medium hover:underline ml-auto">
                Read more <ExternalLink size={11} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI briefing card ──────────────────────────────────────────────────────────
const BRIEFING_LS_TEXT = "fleepit_last_briefing_text";
const BRIEFING_LS_TIME = "fleepit_last_briefing_time";

function AIBriefingCard({ feedItems }) {
  const [digest,    setDigest]    = useState(() => localStorage.getItem(BRIEFING_LS_TEXT) || null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const hasAutoGen = useRef(false);

  const generate = async () => {
    if (loading || feedItems.length === 0) return;
    setLoading(true); setError(null);

    const headlines = feedItems.slice(0, 10).map((item, i) => {
      const text = item.type === "x" ? item.content : item.title;
      return `${i + 1}. [${item.type === "x" ? `@${item.handle}` : item.sourceLabel}] ${text}`;
    }).join("\n");

    const prompt = `You are a DeFi intelligence analyst covering the Mantle blockchain ecosystem.

Based on these recent posts and headlines:
${headlines}

Produce a concise briefing for a DeFi investor with exactly three points:
1. **What's happening on Mantle today** — key developments in 2-3 sentences
2. **Notable opportunities or risks** — anything actionable in 2-3 sentences
3. **One key thing to watch** — the single most important catalyst or risk to monitor

Keep it under 200 words. Be specific and forward-looking.`;

    try {
      const res  = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GEMINI_API_KEY}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 350, temperature: 0.5 }),
      });
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error(json.error?.message || "No response from AI.");

      setDigest(text);
      const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setTimestamp(ts);
      localStorage.setItem(BRIEFING_LS_TEXT, text);
      localStorage.setItem(BRIEFING_LS_TIME, String(Date.now()));
      const uid = localStorage.getItem("fleepit_telegram_chat_id") || undefined;
      sendTelegramAlert(`📰 *Fleepit AI Briefing* — ${ts}\n\n${text.slice(0, 300).replace(/\*\*/g, "")}...`, uid);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAutoGen.current || feedItems.length === 0) return;
    const lastTime = Number(localStorage.getItem(BRIEFING_LS_TIME) || 0);
    if (!lastTime || Date.now() - lastTime > BRIEFING_TTL_MS) {
      hasAutoGen.current = true;
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedItems.length]);

  return (
    <div className="bg-white rounded-xl border border-navy/15 shadow-sm p-5 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
          <Sparkles size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-navy text-sm leading-none">AI Ecosystem Briefing</h3>
          <p className="text-xs text-gray-400 mt-0.5">Powered by Groq · auto-generated every 2h</p>
        </div>
        {loading && (
          <span className="flex items-center gap-1 text-xs text-navy/60">
            <RefreshCw size={11} className="animate-spin" /> Generating...
          </span>
        )}
        {timestamp && !loading && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={11} /> {timestamp}
          </span>
        )}
      </div>

      {!digest && !loading && !error && (
        <div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Generate a real-time briefing from today's Mantle ecosystem feed — what's happening, key opportunities, and one thing to watch.
          </p>
          <button onClick={generate} disabled={feedItems.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors disabled:opacity-60">
            <Sparkles size={14} /> Generate AI Briefing
          </button>
        </div>
      )}

      {loading && !digest && (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={cn("h-3 bg-gray-100 rounded", i === 3 ? "w-2/3" : "w-full")} />
          ))}
        </div>
      )}

      {digest && (
        <div>
          <div className="rounded-lg bg-navy/3 border border-navy/8 p-4">
            {digest.split("\n").map((line, i) => {
              if (!line.trim()) return null;
              const cleaned  = line.replace(/\*\*(.*?)\*\*/g, "$1");
              const isHeader = /^\d+\./.test(line.trim());
              return (
                <p key={i} className={cn("text-sm leading-relaxed mb-2 last:mb-0",
                  isHeader ? "font-semibold text-navy" : "text-gray-700")}>
                  {cleaned}
                </p>
              );
            })}
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-1 text-xs text-navy font-medium hover:underline disabled:opacity-40">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh briefing
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mt-2">
          <p className="text-xs text-red-600 font-medium">Error: {error}</p>
        </div>
      )}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: "all",        label: "All"        },
  { id: "onchain",    label: "On-Chain"   },
  { id: "blog",       label: "Blog"       },
  { id: "newsletter", label: "Newsletter" },
  { id: "media",      label: "Media"      },
  { id: "x",          label: "X Posts"   },
];

function FeedFilterBar({ active, onChange, counts }) {
  return (
    <div className="flex gap-2 flex-wrap mb-5">
      {FILTERS.map(({ id, label }) => (
        <button key={id} onClick={() => onChange(id)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border",
            active === id
              ? "bg-navy text-white border-navy shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:border-navy/30 hover:text-navy"
          )}>
          {label}
          {counts?.[id] > 0 && (
            <span className={cn("ml-1.5 text-xs", active === id ? "text-white/70" : "text-gray-400")}>
              {counts[id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EcosystemFeed({ onchainEvents = [] }) {
  const [filter, setFilter] = useState("all");
  const { allItems, loading, error, lastUpdated, manualRefresh } = useFeedItems(onchainEvents);

  const filtered = filter === "all" ? allItems : allItems.filter((item) => item.type === filter);

  const counts = {
    all:        allItems.length,
    onchain:    allItems.filter((i) => i.type === "onchain").length,
    blog:       allItems.filter((i) => i.type === "blog").length,
    newsletter: allItems.filter((i) => i.type === "newsletter").length,
    media:      allItems.filter((i) => i.type === "media").length,
    x:          allItems.filter((i) => i.type === "x").length,
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-navy">Mantle Ecosystem</h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600">LIVE</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Every post, article, newsletter, X update and on-chain alert about Mantle — one live feed
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-1">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {relativeTime(lastUpdated)}</span>
          )}
          <button onClick={manualRefresh} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-navy hover:underline disabled:opacity-40">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh now
          </button>
        </div>
      </div>

      {/* AI briefing */}
      <AIBriefingCard feedItems={allItems} />

      {/* Filter bar */}
      <FeedFilterBar active={filter} onChange={setFilter} counts={counts} />

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center mb-4">
          <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-700 mb-1">Could not load feed</p>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Feed — single unified list, no sections, no separators */}
      <div className="space-y-3">
        {loading && Array.from({ length: 7 }).map((_, i) => <FeedSkeleton key={i} />)}

        {!loading && filtered.length === 0 && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-10 text-center">
            <Radio size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Nothing here yet</p>
            <p className="text-gray-400 text-xs mt-1">
              On-chain alerts will fire as soon as pool activity is detected · news refreshes every 5 min
            </p>
          </div>
        )}

        {!loading && filtered.map((item) => <FeedCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
