import { useState, useEffect } from "react";

const RSS_SOURCES = [
  "https://www.mantle.xyz/blog/rss.xml",
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://www.theblock.co/rss.xml",
];

const RSS2JSON_BASE = "https://api.rss2json.com/v1/api.json";
const KEYWORDS = ["mantle", "meth", "fbtc", "mnt"];

function isRelevant(item) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  return KEYWORDS.some((kw) => text.includes(kw));
}

export function useNews() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetches = RSS_SOURCES.map((url) =>
      fetch(`${RSS2JSON_BASE}?rss_url=${encodeURIComponent(url)}&count=20`)
        .then((r) => r.json())
        .then((json) => json.items || [])
        .catch(() => [])
    );

    Promise.all(fetches)
      .then((results) => {
        const all = results.flat();
        const filtered = all
          .filter(isRelevant)
          .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
          .slice(0, 20);
        setArticles(filtered);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { articles, loading, error };
}
