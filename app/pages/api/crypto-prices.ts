import type { NextApiRequest, NextApiResponse } from "next";

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

// Static metadata — Binance supplies price + change, we supply the rest
const COIN_META: Record<string, { id: string; name: string; binancePair: string | null }> = {
  BTC:  { id: "bitcoin",     name: "Bitcoin",    binancePair: "BTCUSDT"  },
  ETH:  { id: "ethereum",    name: "Ethereum",   binancePair: "ETHUSDT"  },
  SOL:  { id: "solana",      name: "Solana",     binancePair: "SOLUSDT"  },
  BNB:  { id: "binancecoin", name: "BNB",        binancePair: "BNBUSDT"  },
  USDC: { id: "usd-coin",    name: "USD Coin",   binancePair: "USDCUSDT" },
  USDT: { id: "tether",      name: "Tether",     binancePair: null       }, // base currency on Binance
  PYUSD:{ id: "paypal-usd",  name: "PayPal USD", binancePair: null       },
  EURC: { id: "euro-coin",   name: "Euro Coin",  binancePair: null       },
};

const BINANCE_PAIRS = Object.values(COIN_META)
  .map((m) => m.binancePair)
  .filter(Boolean) as string[];

// Hardcoded fallback used when ALL fetches fail
const FALLBACK: CoinPrice[] = [
  { id: "bitcoin",     symbol: "BTC",   name: "Bitcoin",    price: 67_420, change24h:  2.14 },
  { id: "ethereum",    symbol: "ETH",   name: "Ethereum",   price:  3_540, change24h:  1.82 },
  { id: "solana",      symbol: "SOL",   name: "Solana",     price:    182, change24h:  3.47 },
  { id: "binancecoin", symbol: "BNB",   name: "BNB",        price:    590, change24h:  0.93 },
  { id: "usd-coin",    symbol: "USDC",  name: "USD Coin",   price:   1.00, change24h:  0.01 },
  { id: "tether",      symbol: "USDT",  name: "Tether",     price:   1.00, change24h:  0.00 },
  { id: "paypal-usd",  symbol: "PYUSD", name: "PayPal USD", price:   1.00, change24h: -0.01 },
  { id: "euro-coin",   symbol: "EURC",  name: "Euro Coin",  price:   1.08, change24h:  0.02 },
];

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  // ── Primary: Binance public ticker (no key, real-time) ─────────────
  try {
    const qs = encodeURIComponent(JSON.stringify(BINANCE_PAIRS));
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${qs}&type=MINI`;
    const r   = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) throw new Error(`Binance ${r.status}`);

    const raw: Array<{ symbol: string; lastPrice: string; priceChangePercent: string }> = await r.json();

    // Build a lookup: "SOLUSDT" → { price, change }
    const byPair: Record<string, { price: number; change: number }> = {};
    for (const item of raw) {
      byPair[item.symbol] = {
        price:  parseFloat(item.lastPrice),
        change: parseFloat(item.priceChangePercent),
      };
    }

    // Assemble final list in display order
    const coins: CoinPrice[] = Object.entries(COIN_META).map(([symbol, meta]) => {
      const live = meta.binancePair ? byPair[meta.binancePair] : null;
      // For USDT/PYUSD/EURC with no Binance pair, keep last-known or use $1
      const fallback = FALLBACK.find((f) => f.symbol === symbol)!;
      return {
        id:       meta.id,
        symbol,
        name:     meta.name,
        price:    live?.price  ?? fallback.price,
        change24h: live?.change ?? fallback.change24h,
      };
    });

    res.setHeader("Cache-Control", "s-maxage=2, stale-while-revalidate=4");
    return res.json(coins);
  } catch { /* fall through to secondary */ }

  // ── Secondary: CoinGecko demo (may be rate-limited) ────────────────
  try {
    const ids = "bitcoin,ethereum,solana,binancecoin,usd-coin,tether,paypal-usd,euro-coin";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const r   = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
    const raw = await r.json();

    const coins: CoinPrice[] = FALLBACK.map((fb) => {
      const d = raw[fb.id];
      if (!d) return fb;
      return { ...fb, price: d.usd ?? fb.price, change24h: d.usd_24h_change ?? fb.change24h };
    });

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.json(coins);
  } catch { /* fall through to static fallback */ }

  // ── Tertiary: static hardcoded values ──────────────────────────────
  res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=20");
  return res.json(FALLBACK);
}
