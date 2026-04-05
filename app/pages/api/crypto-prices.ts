import type { NextApiRequest, NextApiResponse } from "next";

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

const COIN_META: Record<string, { id: string; name: string; binancePair: string | null }> = {
  BTC:  { id: "bitcoin",     name: "Bitcoin",    binancePair: "BTCUSDT"  },
  ETH:  { id: "ethereum",    name: "Ethereum",   binancePair: "ETHUSDT"  },
  SOL:  { id: "solana",      name: "Solana",     binancePair: "SOLUSDT"  },
  BNB:  { id: "binancecoin", name: "BNB",        binancePair: "BNBUSDT"  },
  USDC: { id: "usd-coin",    name: "USD Coin",   binancePair: "USDCUSDT" },
  USDT: { id: "tether",      name: "Tether",     binancePair: null       },
  PYUSD:{ id: "paypal-usd",  name: "PayPal USD", binancePair: null       },
  EURC: { id: "euro-coin",   name: "Euro Coin",  binancePair: null       },
};

const BINANCE_PAIRS = Object.values(COIN_META)
  .map((m) => m.binancePair)
  .filter(Boolean) as string[];

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

// ── Server-side in-memory cache (bypasses Vercel CDN stale responses) ─────────
// Keeps ONE fresh Binance fetch shared across all concurrent requests.
// Prevents CDN from freezing BTC/ETH at stale values for 6+ seconds.
let serverCache: { coins: CoinPrice[]; fetchedAt: number } | null = null;
const SERVER_CACHE_TTL = 1_800; // 1.8s — fresh enough for 2s client polls

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  // Disable all HTTP/CDN caching — freshness is controlled by serverCache above
  res.setHeader("Cache-Control", "no-store, max-age=0");

  // Serve cached data if still fresh
  if (serverCache && Date.now() - serverCache.fetchedAt < SERVER_CACHE_TTL) {
    return res.json(serverCache.coins);
  }

  // ── Primary: Binance public ticker (no key, real-time last-trade price) ──
  try {
    const qs  = encodeURIComponent(JSON.stringify(BINANCE_PAIRS));
    // Full ticker — MINI omits priceChangePercent, causing NaN
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${qs}`;
    const r   = await fetch(url, {
      headers: { Accept: "application/json" },
      signal:  AbortSignal.timeout(4_000),
    });
    if (!r.ok) throw new Error(`Binance ${r.status}`);

    const raw: Array<{
      symbol: string;
      lastPrice: string;
      openPrice: string;
      priceChangePercent: string;
    }> = await r.json();

    const byPair: Record<string, { price: number; change: number }> = {};
    for (const item of raw) {
      const price = parseFloat(item.lastPrice);
      const open  = parseFloat(item.openPrice);
      const pct   = parseFloat(item.priceChangePercent);
      byPair[item.symbol] = {
        price,
        change: isNaN(pct) ? (open > 0 ? ((price - open) / open) * 100 : 0) : pct,
      };
    }

    const coins: CoinPrice[] = Object.entries(COIN_META).map(([symbol, meta]) => {
      const live     = meta.binancePair ? byPair[meta.binancePair] : null;
      const fallback = FALLBACK.find((f) => f.symbol === symbol)!;
      return {
        id:       meta.id,
        symbol,
        name:     meta.name,
        price:    live?.price  ?? fallback.price,
        change24h: live?.change ?? fallback.change24h,
      };
    });

    serverCache = { coins, fetchedAt: Date.now() };
    return res.json(coins);
  } catch { /* fall through */ }

  // ── Secondary: CoinGecko ──────────────────────────────────────────────────
  try {
    const ids = "bitcoin,ethereum,solana,binancecoin,usd-coin,tether,paypal-usd,euro-coin";
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const r   = await fetch(url, {
      headers: { Accept: "application/json" },
      signal:  AbortSignal.timeout(4_000),
    });
    if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
    const raw = await r.json();

    const coins: CoinPrice[] = FALLBACK.map((fb) => {
      const d = raw[fb.id];
      if (!d) return fb;
      return { ...fb, price: d.usd ?? fb.price, change24h: d.usd_24h_change ?? fb.change24h };
    });

    serverCache = { coins, fetchedAt: Date.now() };
    return res.json(coins);
  } catch { /* fall through */ }

  // ── Tertiary: stale server cache (better than hardcoded fallback) ─────────
  if (serverCache) return res.json(serverCache.coins);

  // ── Final: hardcoded fallback ─────────────────────────────────────────────
  return res.json(FALLBACK);
}
