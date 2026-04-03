/**
 * useXPosts — fetches live X/Twitter posts for Mantle-related accounts
 * via Nitter RSS (open-source X frontend, no API key required).
 *
 * Strategy:
 *  1. Try each Nitter instance in order until one succeeds per handle.
 *  2. Wrap every request in a CORS proxy (allorigins → corsproxy fallback).
 *  3. Parse the returned RSS XML with DOMParser.
 *  4. Merge all posts, sort by date, de-duplicate, return latest 40.
 *  5. Re-fetch every 5 minutes.
 */

import { useState, useEffect } from "react";

const REFRESH_MS = 5 * 60 * 1000;

// ── Nitter instances (tried in order per handle) ──────────────────────────────
const NITTER_HOSTS = [
  "https://nitter.poast.org",
  "https://nitter.privacydev.net",
  "https://nitter.net",
  "https://nitter.1d4.us",
  "https://twiiit.com",
];

// ── CORS proxy wrappers — bust per-call to defeat proxy-layer caching ─────────
async function fetchViaProxy(url) {
  const bust = Date.now();
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&_=${bust}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const r = await fetch(proxyUrl, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      if (r.ok) {
        const text = await r.text();
        if (text && (text.includes("<item>") || text.includes("<rss"))) return text;
      }
    } catch { /* try next proxy */ }
  }
  return null;
}

// ── Fetch one handle — try Nitter hosts until success ─────────────────────────
async function fetchHandle(handle) {
  for (const host of NITTER_HOSTS) {
    const url  = `${host}/${handle}/rss`;
    const text = await fetchViaProxy(url);
    if (text) return { handle, xml: text };
  }
  return { handle, xml: null };
}

// ── Parse Nitter RSS XML into post objects ────────────────────────────────────
function parseNitterXml(xml, meta) {
  try {
    const doc   = new DOMParser().parseFromString(xml, "application/xml");
    const items = [...doc.querySelectorAll("item")];

    // Channel-level avatar from <image><url>
    const chanAvatar = doc.querySelector("channel > image > url")?.textContent?.trim() || null;

    return items.map((item) => {
      const title   = item.querySelector("title")?.textContent?.trim()   || "";
      const link    = item.querySelector("link")?.textContent?.trim()    || "";
      const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
      const desc    = item.querySelector("description")?.textContent?.trim() || "";

      // Strip HTML from description to get plain text
      const content = desc
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();

      // Use title for RT/reply labels, content for body
      const isRT    = title.toLowerCase().startsWith("rt by");
      const isReply = title.startsWith("R to");

      return {
        id:         `x-live-${meta.handle}-${link}`,
        type:       "x",
        author:     meta.displayName,
        handle:     meta.handle,
        avatar:     chanAvatar || meta.fallbackAvatar,
        content:    content || title,
        timestamp:  pubDate,
        profileUrl: `https://x.com/${meta.handle}`,
        link,
        isRT,
        isReply,
      };
    });
  } catch { return []; }
}

// ── Account registry ──────────────────────────────────────────────────────────
// Add / remove handles here — everything else is automatic.
export const X_ACCOUNTS = [

  // ── Official Mantle ────────────────────────────────────────────────────────
  { handle: "0xMantle",         displayName: "Mantle",          fallbackAvatar: "https://unavatar.io/twitter/0xMantle",         group: "official"   },
  { handle: "MantleEcosystem",  displayName: "Mantle Ecosystem",fallbackAvatar: "https://unavatar.io/twitter/MantleEcosystem",  group: "official"   },

  // ── Mantle protocol accounts ───────────────────────────────────────────────
  { handle: "mETH_Protocol",    displayName: "mETH Protocol",   fallbackAvatar: "https://unavatar.io/twitter/mETH_Protocol",    group: "protocol"   },
  { handle: "AgniFinance",      displayName: "Agni Finance",    fallbackAvatar: "https://unavatar.io/twitter/AgniFinance",      group: "protocol"   },
  { handle: "LendleFinance",    displayName: "Lendle Finance",  fallbackAvatar: "https://unavatar.io/twitter/LendleFinance",    group: "protocol"   },
  { handle: "MerchantMoe_xyz",  displayName: "Merchant Moe",   fallbackAvatar: "https://unavatar.io/twitter/MerchantMoe_xyz",  group: "protocol"   },
  { handle: "InitCapital_",     displayName: "Init Capital",    fallbackAvatar: "https://unavatar.io/twitter/InitCapital_",     group: "protocol"   },
  { handle: "TreehouseFi",      displayName: "Treehouse",       fallbackAvatar: "https://unavatar.io/twitter/TreehouseFi",      group: "protocol"   },
  { handle: "FBTCofficial",     displayName: "FBTC",            fallbackAvatar: "https://unavatar.io/twitter/FBTCofficial",     group: "protocol"   },

  // ── Founders / core team ────────────────────────────────────────────────────
  { handle: "arjunkalsy",       displayName: "Arjun Kalsy",     fallbackAvatar: "https://unavatar.io/twitter/arjunkalsy",       group: "founder"    },
  { handle: "iamBorko",         displayName: "Borko",           fallbackAvatar: "https://unavatar.io/twitter/iamBorko",         group: "founder"    },
  { handle: "julienstark",      displayName: "Julien Stark",    fallbackAvatar: "https://unavatar.io/twitter/julienstark",      group: "founder"    },

  // ── Ecosystem analysts & KOLs ───────────────────────────────────────────────
  { handle: "inversebrah",      displayName: "inversebrah",     fallbackAvatar: "https://unavatar.io/twitter/inversebrah",      group: "analyst"    },
  { handle: "arndxt_xo",        displayName: "arndxt",          fallbackAvatar: "https://unavatar.io/twitter/arndxt_xo",        group: "analyst"    },
  { handle: "DefiIgnas",        displayName: "Ignas | DeFi",    fallbackAvatar: "https://unavatar.io/twitter/DefiIgnas",        group: "analyst"    },
  { handle: "route2fi",         displayName: "Route 2 FI",      fallbackAvatar: "https://unavatar.io/twitter/route2fi",         group: "analyst"    },
  { handle: "0xMert_",          displayName: "Mert",            fallbackAvatar: "https://unavatar.io/twitter/0xMert_",          group: "analyst"    },
  { handle: "defimoon_eth",     displayName: "DeFi Moon",       fallbackAvatar: "https://unavatar.io/twitter/defimoon_eth",     group: "analyst"    },
  { handle: "CryptoHayes",      displayName: "Arthur Hayes",    fallbackAvatar: "https://unavatar.io/twitter/CryptoHayes",      group: "analyst"    },
  { handle: "TokenBrice",       displayName: "TokenBrice",      fallbackAvatar: "https://unavatar.io/twitter/TokenBrice",       group: "analyst"    },
];

// Keywords to decide if a non-official post is Mantle-relevant
const KW = [
  "mantle", " mnt ", "$mnt", "meth", "fbtc",
  "agni", "lendle", "merchant moe", "init capital", "treehouse",
  "mantle network", "mantle l2", "0xmantle",
];

function isMantle(post) {
  const hay = ` ${post.content} `.toLowerCase();
  return KW.some((k) => hay.includes(k));
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useXPosts() {
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Fetch all accounts in parallel
      const results = await Promise.allSettled(
        X_ACCOUNTS.map((acct) => fetchHandle(acct.handle))
      );

      if (cancelled) return;

      let failed = 0;
      const merged = [];
      const seen   = new Set();

      results.forEach((res, i) => {
        if (res.status !== "fulfilled" || !res.value.xml) { failed++; return; }
        const acct  = X_ACCOUNTS[i];
        const items = parseNitterXml(res.value.xml, acct);

        items.forEach((post) => {
          // Official / protocol accounts → include all posts
          // Analysts / founders → only include Mantle-relevant posts
          const include =
            acct.group === "official" ||
            acct.group === "protocol" ||
            isMantle(post);

          if (!include) return;
          if (post.isRT)    return; // skip retweets — keep timeline clean
          if (seen.has(post.link)) return;
          seen.add(post.link);
          merged.push(post);
        });
      });

      merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (!cancelled) {
        setPosts(merged.slice(0, 50));
        setFailedCount(failed);
        setLoading(false);
      }
    };

    run();
    const id = setInterval(run, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { posts, loading, failedCount };
}
