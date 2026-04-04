import { useState, useEffect, useRef } from "react";
import type { CoinPrice } from "../pages/api/crypto-prices";
import CoinImg from "./CoinImg";

function fmtPrice(p: number): string {
  if (p >= 10_000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1_000)  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)      return p.toFixed(2);
  return p.toFixed(4);
}

type Dir = "up" | "down" | "";
interface DigitState { c: string; n: number; }

// Renders a number string where only changed digits animate
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

function TickerItem({
  coin, flash, pctFlash,
}: {
  coin: CoinPrice;
  flash?: FlashInfo;
  pctFlash?: FlashInfo;
}) {
  const up24     = coin.change24h >= 0;
  const change24 = Math.abs(coin.change24h).toFixed(2);
  const priceDir: Dir = flash    ? flash.dir    : "";
  const pctDir:   Dir = pctFlash ? pctFlash.dir : "";

  return (
    <span className="inline-flex items-center gap-1.5 px-4 shrink-0 select-none">
      <CoinImg symbol={coin.symbol} size={16} />
      <span className="font-display font-semibold text-[11px] text-gp-ghost-dim">
        {coin.symbol}
      </span>

      {/* Price — per-digit animation */}
      <span className="font-mono text-[11px] text-gp-ghost">
        $<DigitRoll value={fmtPrice(coin.price)} dir={priceDir} baseClass="text-gp-ghost" />
      </span>

      {/* 24h % — per-digit animation */}
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
  const [coins, setCoins]        = useState<CoinPrice[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [live, setLive]          = useState(false);
  const [flashMap, setFlashMap]  = useState<Record<string, FlashInfo>>({});
  const [pctMap, setPctMap]      = useState<Record<string, FlashInfo>>({});

  const prevPriceRef = useRef<Record<string, number>>({});
  const prevPctRef   = useRef<Record<string, number>>({});
  const priceNRef    = useRef<Record<string, number>>({});
  const pctNRef      = useRef<Record<string, number>>({});

  async function load() {
    try {
      const res = await fetch("/api/crypto-prices");
      if (!res.ok) return;
      const data: CoinPrice[] = await res.json();

      const priceUp: Record<string, FlashInfo> = {};
      const pctUp:   Record<string, FlashInfo> = {};

      for (const c of data) {
        // Price flash
        const pp = prevPriceRef.current[c.symbol];
        if (pp !== undefined && c.price !== pp) {
          priceNRef.current[c.symbol] = (priceNRef.current[c.symbol] ?? 0) + 1;
          priceUp[c.symbol] = { dir: c.price > pp ? "up" : "down", n: priceNRef.current[c.symbol] };
        }
        prevPriceRef.current[c.symbol] = c.price;

        // % change flash
        const pc = prevPctRef.current[c.symbol];
        if (pc !== undefined && c.change24h !== pc) {
          pctNRef.current[c.symbol] = (pctNRef.current[c.symbol] ?? 0) + 1;
          pctUp[c.symbol] = { dir: c.change24h > pc ? "up" : "down", n: pctNRef.current[c.symbol] };
        }
        prevPctRef.current[c.symbol] = c.change24h;
      }

      setCoins(data);
      setUpdatedAt(new Date());
      setLive(true);
      if (Object.keys(priceUp).length > 0) setFlashMap((p) => ({ ...p, ...priceUp }));
      if (Object.keys(pctUp).length   > 0) setPctMap((p)   => ({ ...p, ...pctUp }));
    } catch {
      setLive(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2_000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div
      className="w-full bg-gp-black border-b border-gp-border overflow-hidden flex items-center shrink-0"
      style={{ height: "36px" }}
    >
      {/* Live indicator + timestamp */}
      <div className="shrink-0 flex items-center gap-1.5 pl-3 pr-3 border-r border-gp-border-2 h-full">
        <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse-dot" : "bg-gp-border-3"}`} />
        <span className="font-mono text-[9px] uppercase tracking-widest text-gp-border-3 hidden sm:block">
          {live && updatedAt
            ? updatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : "offline"}
        </span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex items-center"
          style={{
            width: "max-content",
            animation: "ticker-scroll 48s linear infinite",
            willChange: "transform",
          }}
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
        <span className="font-mono text-[8px] uppercase tracking-widest text-gp-border-2">Binance · 2s</span>
      </div>
    </div>
  );
}
