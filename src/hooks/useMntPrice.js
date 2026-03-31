import { useState, useEffect } from "react";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_24hr_change=true";

export function useMntPrice() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchPrice = async (signal) => {
    try {
      const res = await fetch(COINGECKO_URL, { signal });
      if (!res.ok) throw new Error("CoinGecko unavailable");
      const json = await res.json();
      setData({
        usd: json.mantle.usd,
        change24h: json.mantle.usd_24h_change,
      });
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPrice(controller.signal);
    const id = setInterval(() => fetchPrice(controller.signal), 60_000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return { data, error };
}
