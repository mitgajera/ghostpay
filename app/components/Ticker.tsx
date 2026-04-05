import { useState, useEffect, useRef } from "react";
import type { CoinPrice } from "../pages/api/crypto-prices";
import CoinImg from "./CoinImg";

// ── Binance direct fetch (browser → Binance, no server hop, no caching) ───────
// Binance public API is CORS-enabled — browsers can call it directly.
// This guarantees real-time prices regardless of server/CDN caching.
const BINANCE_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "USDCUSDT"];
const PAIR_SYMBOL: Record<string, string> = {
  BTCUSDT: "BTC", ETHUSDT: "ETH", SOLUSDT: "SOL", BNBUSDT: "BNB", USDCUSDT: "USDC",
};

async function fetchBinancePrices(): Promise<Record<string, { price: number; change24h: number }>> {
  const qs  = encodeURIComponent(JSON.stringify(BINANCE_PAIRS));
  // Full ticker (no type=MINI) — includes priceChangePercent field
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbols=${qs}`,
    { signal: AbortSignal.timeout(3_000) }
  );
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const raw: Array<{
    symbol: string;
    lastPrice: string;
    openPrice: string;
    priceChangePercent: string;
  }> = await res.json();
  const out: Record<string, { price: number; change24h: number }> = {};
  for (const item of raw) {
    const sym = PAIR_SYMBOL[item.symbol];
    if (!sym) continue;
    const price  = parseFloat(item.lastPrice);
    const open   = parseFloat(item.openPrice);
    // Use priceChangePercent if valid, else compute from open/last
    const pct    = parseFloat(item.priceChangePercent);
    const change24h = isNaN(pct)
      ? (open > 0 ? ((price - open) / open) * 100 : 0)
      : pct;
    out[sym] = { price, change24h };
  }
  return out;
}

function fmtPrice(p: number): string {
  if (p >= 10_000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1_000)  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)      return p.toFixed(2);
  return p.toFixed(4);
}

type Dir = "up" | "down" | "";
interface DigitState { c: string; n: number; }

function DigitRoll({ value, dir, baseClass }: { value: string; dir: Dir; baseClass?: string }) {
  const [digits, setDigits] = useState<DigitState[]>(
    () => value.split("").map((c) => ({ c, n: 0 }))
  );
  const prevRef = useRef("");

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    setDigits((old) => {
      const vArr = value.split(""), pArr = prev.split("");
      const vLen = vArr.length,    pLen = pArr.length;
      return vArr.map((c, i) => {
        const pIdx   = pLen - (vLen - i);
        const oldIdx = old.length - (vLen - i);
        const prevChar = pIdx >= 0 ? pArr[pIdx] : "";
        const oldN     = oldIdx >= 0 ? old[oldIdx].n : 0;
        const changed  = /[0-9]/.test(c) && c !== prevChar && dir !== "" && prev !== "";
        return { c, n: changed ? oldN + 1 : oldN };
      });
    });
  }, [value, dir]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {digits.map((d, i) => {
        const anim = d.n > 0 && dir !== "" && /[0-9]/.test(d.c);
        return (
          <span
            key={`${i}-${d.n}`}
            className={`inline-block ${anim ? (dir === "up" ? "price-slide-up" : "price-slide-down") : (baseClass ?? "")}`}
          >
            {d.c}
          </span>
        );
      })}
    </>
  );
}

interface FlashInfo { dir: "up" | "down"; n: number; }

function TickerItem({ coin, flash, pctFlash }: {
  coin: CoinPrice; flash?: FlashInfo; pctFlash?: FlashInfo;
}) {
  const up24     = coin.change24h >= 0;
  const change24 = Math.abs(coin.change24h).toFixed(2);
  const priceDir: Dir = flash    ? flash.dir    : "";
  const pctDir:   Dir = pctFlash ? pctFlash.dir : "";

  return (
    <span className="inline-flex items-center gap-1.5 px-4 shrink-0 select-none">
      <CoinImg symbol={coin.symbol} size={16} />
      <span className="font-display font-semibold text-[11px] text-gp-ghost-dim">{coin.symbol}</span>

      <span className="font-mono text-[11px] text-gp-ghost">
        $<DigitRoll value={fmtPrice(coin.price)} dir={priceDir} baseClass="text-gp-ghost" />
      </span>

      <span className={`font-mono text-[10px] ${up24 ? "text-emerald-400/70" : "text-red-400/60"}`}>
        {up24 ? "+" : "-"}<DigitRoll
          value={change24}
          dir={pctDir}
          baseClass={up24 ? "text-emerald-400/70" : "text-red-400/60"}
        />%
      </span>

      <span className="text-gp-border-3 text-[10px] ml-1">·</span>
    </span>
  );
}

export default function Ticker() {
  const [coins, setCoins]         = useState<CoinPrice[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [live, setLive]           = useState(false);
  const [flashMap, setFlashMap]   = useState<Record<string, FlashInfo>>({});
  const [pctMap,   setPctMap]     = useState<Record<string, FlashInfo>>({});

  const prevPriceRef = useRef<Record<string, number>>({});
  const prevPctRef   = useRef<Record<string, number>>({});
  const priceNRef    = useRef<Record<string, number>>({});
  const pctNRef      = useRef<Record<string, number>>({});

  // Initial load — get full coin list + metadata from our API
  useEffect(() => {
    fetch("/api/crypto-prices")
      .then((r) => r.json())
      .then((data: CoinPrice[]) => {
        setCoins(data);
        for (const c of data) {
          prevPriceRef.current[c.symbol] = c.price;
          prevPctRef.current[c.symbol]   = c.change24h;
        }
        setLive(true);
        setUpdatedAt(new Date());
      })
      .catch(() => {});
  }, []);

  // Live price updates — fetch Binance directly every 2s (bypasses all caching)
  useEffect(() => {
    async function poll() {
      try {
        const live = await fetchBinancePrices();

        const priceUp: Record<string, FlashInfo> = {};
        const pctUp:   Record<string, FlashInfo> = {};

        setCoins((prev) =>
          prev.map((coin) => {
            const update = live[coin.symbol];
            if (!update) return coin;

            const pp = prevPriceRef.current[coin.symbol];
            const pc = prevPctRef.current[coin.symbol];

            if (pp !== undefined && update.price !== pp) {
              priceNRef.current[coin.symbol] = (priceNRef.current[coin.symbol] ?? 0) + 1;
              priceUp[coin.symbol] = {
                dir: update.price > pp ? "up" : "down",
                n:   priceNRef.current[coin.symbol],
              };
            }
            if (pc !== undefined && update.change24h !== pc) {
              pctNRef.current[coin.symbol] = (pctNRef.current[coin.symbol] ?? 0) + 1;
              pctUp[coin.symbol] = {
                dir: update.change24h > pc ? "up" : "down",
                n:   pctNRef.current[coin.symbol],
              };
            }

            prevPriceRef.current[coin.symbol] = update.price;
            prevPctRef.current[coin.symbol]   = update.change24h;

            return { ...coin, price: update.price, change24h: update.change24h };
          })
        );

        if (Object.keys(priceUp).length > 0) setFlashMap((p) => ({ ...p, ...priceUp }));
        if (Object.keys(pctUp).length   > 0) setPctMap((p)   => ({ ...p, ...pctUp   }));
        setUpdatedAt(new Date());
        setLive(true);
      } catch {
        setLive(false);
      }
    }

    if (coins.length === 0) return; // wait for initial load
    const t = setInterval(poll, 2_000);
    poll(); // immediate first poll
    return () => clearInterval(t);
  }, [coins.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (coins.length === 0) {
    return (
      <div className="w-full bg-gp-black border-b border-gp-border flex items-center px-4 gap-2 shrink-0" style={{ height: "36px" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-gp-border-3 animate-pulse-dot" />
        <span className="font-mono text-[10px] text-gp-border-3">Loading prices…</span>
      </div>
    );
  }

  const items = [...coins, ...coins];

  return (
    <div className="w-full bg-gp-black border-b border-gp-border overflow-hidden flex items-center shrink-0" style={{ height: "36px" }}>
      {/* Live indicator */}
      <div className="shrink-0 flex items-center gap-1.5 pl-3 pr-3 border-r border-gp-border-2 h-full">
        <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse-dot" : "bg-gp-border-3"}`} />
        <span className="font-mono text-[9px] uppercase tracking-widest text-gp-border-3 hidden sm:block">
          {live && updatedAt
            ? `${updatedAt.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "UTC",
              })} UTC`
            : "offline"}
        </span>
      </div>
      
      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex items-center"
          style={{ width: "max-content", animation: "ticker-scroll 48s linear infinite", willChange: "transform" }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
        >
          {items.map((coin, i) => (
            <TickerItem
              key={`${coin.symbol}-${i}`}
              coin={coin}
              flash={i < coins.length ? flashMap[coin.symbol] : undefined}
              pctFlash={i < coins.length ? pctMap[coin.symbol] : undefined}
            />
          ))}
        </div>
      </div>

      {/* Source label */}
      <div className="shrink-0 px-3 border-l border-gp-border-2 h-full items-center hidden sm:flex">
        <span className="font-mono text-[8px] uppercase tracking-widest text-gp-border-2">Binance · live</span>
      </div>
    </div>
  );
}
