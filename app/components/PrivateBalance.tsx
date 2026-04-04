import { useState } from "react";
import { usePrivateBalance } from "../hooks/usePrivateBalance";
import { STABLECOINS, STABLECOIN_SYMBOLS, StablecoinSymbol } from "../constants";
import CoinImg from "./CoinImg";

interface Props {
  authToken: string | null;
}

function CoinBalance({ authToken, coin }: { authToken: string | null; coin: StablecoinSymbol }) {
  const meta = STABLECOINS[coin];
  const { balance, loading, refresh } = usePrivateBalance(authToken, meta.mint);
  const hasBalance = balance !== null && balance > 0;
  const whole = balance !== null ? Math.floor(balance / 1_000_000).toLocaleString("en-US") : "0";
  const frac  = balance !== null ? String(balance % 1_000_000).padStart(6, "0") : "000000";

  return (
    <div
      className="flex flex-col items-center gap-3 px-5 py-5 rounded-xl border transition-colors"
      style={hasBalance
        ? { borderColor: `${meta.color}30`, background: meta.bgColor }
        : { borderColor: "#1e1e1e", background: "#111111" }
      }
    >
      {/* Coin label */}
      <div className="flex items-center gap-2">
        <CoinImg symbol={coin} size={18} />
        <span
          className="font-mono text-[10px] font-semibold px-2 py-px rounded"
          style={{ color: meta.color, background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
        >
          {coin}
        </span>
        <span className="font-mono text-[9px] text-gp-ghost-dim/40 uppercase tracking-widest">{meta.name}</span>
      </div>

      {/* Amount */}
      {!authToken ? (
        <p className="font-mono text-xs text-gp-border-3 tracking-wide py-1">—</p>
      ) : loading && balance === null ? (
        <div className="flex items-center gap-1 py-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-gp-border-3 animate-pulse-dot"
              style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </div>
      ) : (
        <div
          className="text-center select-none"
          style={hasBalance ? { filter: `drop-shadow(0 0 16px ${meta.color}33)` } : undefined}
        >
          <span className="font-display font-extrabold text-gp-white" style={{ fontSize: "clamp(1.5rem,5vw,2.25rem)", letterSpacing: "-0.02em" }}>
            {whole}
          </span>
          <span className="font-display font-bold text-gp-ghost-dim" style={{ fontSize: "clamp(0.875rem,2.5vw,1.25rem)", letterSpacing: "-0.02em" }}>
            .{frac}
          </span>
        </div>
      )}

      {/* Status dot */}
      {authToken && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-widest ${
          hasBalance ? "border-current/25 text-current" : "border-gp-border-2 text-gp-ghost-dim/30"
        }`} style={hasBalance ? { color: meta.color } : undefined}>
          <span className={`w-1 h-1 rounded-full ${hasBalance ? "animate-pulse-dot" : "bg-gp-border-3"}`}
            style={hasBalance ? { background: meta.color } : undefined} />
          {hasBalance ? "In TEE" : "Empty"}
        </div>
      )}

      {authToken && (
        <button
          onClick={refresh}
          disabled={loading}
          className="font-mono text-[9px] text-gp-border-3 hover:text-gp-ghost-dim/60 transition-colors disabled:opacity-30 uppercase tracking-widest"
        >
          {loading ? "…" : "↻"}
        </button>
      )}
    </div>
  );
}

export default function PrivateBalance({ authToken }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visibleCoins = expanded ? STABLECOIN_SYMBOLS : (["USDC", "USDT"] as StablecoinSymbol[]);

  return (
    <div className="gp-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="gp-label">Private balance</span>
        {!authToken && (
          <span className="font-mono text-[9px] text-gp-border-3 uppercase tracking-widest">Authorize TEE to view</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {visibleCoins.map((coin) => (
          <CoinBalance key={coin} authToken={authToken} coin={coin} />
        ))}
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="self-center font-mono text-[9px] text-gp-border-3 hover:text-gp-ghost-dim/50 uppercase tracking-widest transition-colors"
      >
        {expanded ? "Show less ▲" : `Show all ${STABLECOIN_SYMBOLS.length} coins ▼`}
      </button>
    </div>
  );
}
