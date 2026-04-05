import { useState, useEffect, useRef, useCallback } from "react";

type Dir = "up" | "down" | "";

const SOL_LOGO = "https://assets.coingecko.com/coins/images/4128/small/solana.png";

// Fetch SOL price directly from Binance (browser → Binance, bypasses all server/CDN caching)
async function fetchSolPrice(): Promise<{ price: number; change24h: number }> {
  // Full ticker — includes priceChangePercent (MINI type omits it, causing NaN)
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=SOLUSDT`,
    { signal: AbortSignal.timeout(3_000) }
  );
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const d = await res.json();
  const price  = parseFloat(d.lastPrice);
  const open   = parseFloat(d.openPrice);
  const pct    = parseFloat(d.priceChangePercent);
  const change24h = isNaN(pct)
    ? (open > 0 ? ((price - open) / open) * 100 : 0)
    : pct;
  return { price, change24h };
}

// ── DigitRoll ─────────────────────────────────────────────────────────────────
// Renders a number string where ONLY the digits that changed slide in/out.
// Uses right-alignment for comparison so "80.20" → "80.22" animates only "2".
// n per-digit is stored in state; changing n causes React to remount that span,
// which restarts the CSS animation from frame 0.
interface DigitState { c: string; n: number; }

function DigitRoll({ value, dir, defaultColor }: { value: string; dir: Dir; defaultColor?: string }) {
  const [digits, setDigits] = useState<DigitState[]>(
    () => value.split("").map((c) => ({ c, n: 0 }))
  );
  const prevRef = useRef<string>("");

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;

    setDigits((old) => {
      const vArr = value.split("");
      const pArr = prev.split("");
      const vLen = vArr.length;
      const pLen = pArr.length;

      return vArr.map((c, i) => {
        // Right-align: find the matching old position
        const pIdx   = pLen - (vLen - i);
        const oldIdx = old.length - (vLen - i);
        const prevChar = pIdx >= 0 ? pArr[pIdx] : "";
        const oldN     = oldIdx >= 0 ? old[oldIdx].n : 0;
        // Only animate pure digit characters, only when direction is set
        const changed  = /[0-9]/.test(c) && c !== prevChar && dir !== "" && prev !== "";
        return { c, n: changed ? oldN + 1 : oldN };
      });
    });
  }, [value, dir]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="inline-flex" style={{ fontVariantNumeric: "tabular-nums" }}>
      {digits.map((d, i) => {
        const isAnimated = d.n > 0 && dir !== "" && /[0-9]/.test(d.c);
        return (
          <span
            key={`${i}-${d.n}`}
            className={`inline-block ${
              isAnimated
                ? dir === "up" ? "price-slide-up" : "price-slide-down"
                : ""
            }`}
            style={!isAnimated && defaultColor ? { color: defaultColor } : undefined}
          >
            {d.c}
          </span>
        );
      })}
    </span>
  );
}

// ── SolPrice ──────────────────────────────────────────────────────────────────
function SolPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [pct, setPct]     = useState<number | null>(null);
  const [priceDir, setPDir] = useState<Dir>("");
  const [pctDir,   setCDir] = useState<Dir>("");
  const [bgAnim,  setBg]    = useState<Dir>("");

  const prevPriceRef = useRef<number | null>(null);
  const prevPctRef   = useRef<number | null>(null);
  const pTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arm = useCallback((
    dir: "up" | "down",
    set: (d: Dir) => void,
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (ref.current) clearTimeout(ref.current);
    set(dir);
    ref.current = setTimeout(() => set(""), 950);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        // Fetch SOL directly from Binance — no server, no CDN caching
        const sol = await fetchSolPrice();

        if (prevPriceRef.current !== null && sol.price !== prevPriceRef.current) {
          const d: "up" | "down" = sol.price > prevPriceRef.current ? "up" : "down";
          arm(d, setPDir, pTimer);
          if (bTimer.current) clearTimeout(bTimer.current);
          setBg(d);
          bTimer.current = setTimeout(() => setBg(""), 950);
        }
        if (prevPctRef.current !== null && sol.change24h !== prevPctRef.current) {
          const d: "up" | "down" = sol.change24h > prevPctRef.current ? "up" : "down";
          arm(d, setCDir, cTimer);
        }

        prevPriceRef.current = sol.price;
        prevPctRef.current   = sol.change24h;
        setPrice(sol.price);
        setPct(sol.change24h);
      } catch { /* silent */ }
    }

    load();
    const t = setInterval(load, 2_000);
    return () => {
      clearInterval(t);
      [pTimer, cTimer, bTimer].forEach((r) => { if (r.current) clearTimeout(r.current); });
    };
  }, [arm]);

  if (price === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-gp-border-3">
        <img src={SOL_LOGO} alt="SOL" width={13} height={13} className="rounded-full opacity-40" />
        <span className="font-mono text-[10px]">SOL —</span>
      </span>
    );
  }

  const up24 = (pct ?? 0) >= 0;
  const pctColor = up24 ? "#34d399cc" : "#f87171b3";

  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-0.5 rounded ${
        bgAnim === "up" ? "price-bg-flash-up" : bgAnim === "down" ? "price-bg-flash-down" : ""
      }`}
    >
      <img src={SOL_LOGO} alt="SOL" width={13} height={13} className="rounded-full shrink-0" loading="eager" />
      <span className="font-mono text-[10px] text-gp-border-3 tracking-widest uppercase">SOL</span>

      {/* Price — only changed digits animate */}
      <span className="font-mono text-[11px] font-medium text-gp-ghost">
        $<DigitRoll value={price.toFixed(2)} dir={priceDir} defaultColor="#e8e6e1" />
      </span>

    </span>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
export default function Footer() {
  return (
    <footer className="w-full border-t border-gp-border bg-gp-black shrink-0" style={{ height: "40px" }}>
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between font-mono text-[10px] text-gp-border-3">

        <SolPrice />

        <div className="hidden sm:flex items-center gap-3 uppercase tracking-[0.14em] text-[9px]">
          <span className="text-gp-border-2">GhostPay</span>
          <span className="text-gp-border-2">·</span>
          <a href="https://magicblock.gg" target="_blank" rel="noopener noreferrer" className="hover:text-gp-ghost-dim transition-colors">
            Powered by MagicBlock
          </a>
          <span className="text-gp-border-2">·</span>
          <span className="text-gp-border-2">Built on Solana</span>
          <span className="text-gp-border-2">·</span>
          <span className="text-gp-border-2">Intel TDX</span>
        </div>

        <div className="flex items-center gap-3">
          <a href="https://github.com/mitgajera/ghostpay" target="_blank" rel="noopener noreferrer" className="hover:text-gp-ghost-dim transition-colors flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 0.319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <span className="text-gp-border-2 hidden sm:inline">·</span>
          <span className="text-gp-border-2 hidden sm:inline">© 2026 GhostPay</span>
        </div>

      </div>
    </footer>
  );
}
