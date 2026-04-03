import { usePrivateBalance } from "../hooks/usePrivateBalance";

interface Props {
  authToken: string | null;
}

export default function PrivateBalance({ authToken }: Props) {
  const { balance, loading, refresh } = usePrivateBalance(authToken);

  const hasBalance = balance !== null && balance > 0;
  const usdcWhole  = balance !== null ? Math.floor(balance / 1_000_000).toLocaleString("en-US") : null;
  const usdcFrac   = balance !== null ? String(balance % 1_000_000).padStart(6, "0") : null;

  return (
    <div className="gp-card p-7 flex flex-col items-center gap-6">

      {/* Label */}
      <span className="gp-label text-center">Private balance</span>

      {/* Balance number */}
      <div className="text-center">
        {!authToken ? (
          <p className="font-mono text-xs text-gp-border-3 tracking-wide py-4">
            Authorize TEE access to view
          </p>
        ) : loading && balance === null ? (
          <div className="flex items-center gap-1.5 py-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gp-border-3 animate-pulse-dot"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            ))}
          </div>
        ) : (
          <div
            className="select-none"
            style={hasBalance ? { filter: "drop-shadow(0 0 32px rgba(26,122,74,0.2))" } : undefined}
          >
            <span className="font-display font-extrabold text-gp-white" style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)", letterSpacing: "-0.02em" }}>
              {usdcWhole ?? "0"}
            </span>
            <span className="font-display font-bold text-gp-ghost-dim" style={{ fontSize: "clamp(1.25rem, 4vw, 2rem)", letterSpacing: "-0.02em" }}>
              .{usdcFrac ?? "000000"}
            </span>
            <span className="block font-mono text-xs text-gp-ghost-dim/50 uppercase tracking-[0.2em] mt-2">
              USDC
            </span>
          </div>
        )}
      </div>

      {/* Status pill */}
      {authToken && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-widest ${
          hasBalance
            ? "border-gp-green/25 bg-gp-green/8 text-gp-green"
            : "border-gp-border-2 text-gp-ghost-dim/50"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasBalance ? "bg-gp-green animate-pulse-dot" : "bg-gp-border-3"}`} />
          {hasBalance ? "Inside TEE · ephemeral rollup" : "No balance"}
        </div>
      )}

      {/* Refresh */}
      {authToken && (
        <button
          onClick={refresh}
          disabled={loading}
          className="font-mono text-[10px] text-gp-border-3 hover:text-gp-ghost-dim/60 transition-colors disabled:opacity-30 uppercase tracking-widest"
        >
          {loading ? "Refreshing…" : "Refresh ↻"}
        </button>
      )}
    </div>
  );
}
