import { useState, useEffect, useRef } from "react";
import { sendTelegramAlert } from "../utils/telegram";

const DEFILLAMA_URL = "https://yields.llama.fi/pools";
const SNAP_KEY      = "fleepit_pool_snapshot";
const POLL_MS       = 5 * 60 * 1000; // poll every 5 minutes

// ── Snapshot helpers ──────────────────────────────────────────────────────────
function loadSnap() {
  try { return JSON.parse(sessionStorage.getItem(SNAP_KEY) || "null"); }
  catch { return null; }
}

function saveSnap(pools) {
  sessionStorage.setItem(SNAP_KEY, JSON.stringify({
    ids:  pools.map((p) => p.pool),
    apys: Object.fromEntries(pools.map((p) => [p.pool, p.apy ?? 0])),
  }));
}

// ── Event detection ───────────────────────────────────────────────────────────
function detectEvents(current, snap) {
  if (!snap) return [];
  const now     = new Date().toISOString();
  const prevIds = new Set(snap.ids);
  const events  = [];

  current.forEach((p) => {
    // New pool appeared on Mantle
    if (!prevIds.has(p.pool)) {
      events.push({ type: "new-pool", pool: p, timestamp: now });
    }

    // APY surged ≥ 25% relative to last snapshot
    const prev = snap.apys[p.pool];
    const curr = p.apy ?? 0;
    if (prev > 0 && curr > 0 && (curr - prev) / prev >= 0.25) {
      events.push({
        type: "apy-surge",
        pool: p,
        prevApy: prev,
        currApy: curr,
        changePct: Math.round(((curr - prev) / prev) * 100),
        timestamp: now,
      });
    }
  });

  return events;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePools() {
  const [pools, setPools]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [onchainEvents, setOnchainEvents] = useState([]);
  const isFirstFetch = useRef(true);

  useEffect(() => {
    const ac = new AbortController();

    const run = () => {
      fetch(DEFILLAMA_URL, { signal: ac.signal })
        .then((r) => { if (!r.ok) throw new Error("Failed to fetch pools"); return r.json(); })
        .then((json) => {
          const mantle = (json.data || []).filter(
            (p) => p.chain?.toLowerCase() === "mantle"
          );

          // Skip event detection on the very first page load —
          // only compare on interval fetches so stale snapshots don't fire noise.
          if (!isFirstFetch.current) {
            const snap = loadSnap();
            const evts = detectEvents(mantle, snap);

            if (evts.length > 0) {
              setOnchainEvents(evts);

              // Fire Telegram alerts for each event
              const uid = localStorage.getItem("fleepit_telegram_chat_id") || undefined;
              evts.forEach((e) => {
                if (e.type === "new-pool") {
                  sendTelegramAlert(
                    `🆕 *New Mantle Pool Detected*\n\n*Protocol:* ${e.pool.project}\n*Token:* ${e.pool.symbol}\n*APY:* ${(e.pool.apy ?? 0).toFixed(2)}%\n\nBe early — open Fleepit`,
                    uid
                  );
                } else if (e.type === "apy-surge") {
                  sendTelegramAlert(
                    `⚡ *APY Surge on Mantle*\n\n*Pool:* ${e.pool.symbol} (${e.pool.project})\n*${e.prevApy.toFixed(2)}% → ${e.currApy.toFixed(2)}%* (+${e.changePct}%)\n\nAnalyze it on Fleepit`,
                    uid
                  );
                }
              });
            }
          }

          saveSnap(mantle);
          isFirstFetch.current = false;
          setPools(mantle);
        })
        .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
        .finally(() => setLoading(false));
    };

    run();
    const id = setInterval(run, POLL_MS);
    return () => { ac.abort(); clearInterval(id); };
  }, []);

  return { pools, loading, error, onchainEvents };
}
