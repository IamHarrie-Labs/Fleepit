/**
 * Read-only subscriber count for the Alerts page.
 * Returns the real SCARD of the fleepit:subscribers Redis set --
 * never exposes the Redis REST token to the client.
 */

export const config = { maxDuration: 10 };

const REDIS_KEY = "fleepit:subscribers";

async function redis(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return res.json();
}

export default async function handler(req, res) {
  try {
    const result = await redis(["SCARD", REDIS_KEY]);
    if (result === null) {
      return res.status(200).json({ ok: true, configured: false, count: 0 });
    }
    return res.status(200).json({ ok: true, configured: true, count: result.result ?? 0 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
