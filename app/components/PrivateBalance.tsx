import { usePrivateBalance } from "../hooks/usePrivateBalance";

interface Props {
  authToken: string | null;
}

export default function PrivateBalance({ authToken }: Props) {
  const { balance, loading, refresh } = usePrivateBalance(authToken);

  const usdc = balance !== null ? (balance / 1_000_000).toFixed(6) : null;

  return (
    <div className="bg-gp-surface border border-gp-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-gp-ghost-dim uppercase tracking-widest">Private balance</span>
        <button
          onClick={refresh}
          disabled={loading || !authToken}
          className="font-mono text-[10px] text-gp-ghost-dim hover:text-gp-ghost transition-colors disabled:opacity-30 uppercase tracking-widest"
        >
          {loading ? "···" : "Refresh"}
        </button>
      </div>

      <div className="text-center py-6">
        {!authToken ? (
          <p className="font-mono text-xs text-gp-border-2">Authorize TEE to view balance</p>
        ) : (
          <>
            <p className="font-display font-bold text-4xl text-gp-white tracking-tight">
              {usdc ?? "—"}
            </p>
            <p className="font-mono text-xs text-gp-ghost-dim mt-2">USDC · inside TEE ephemeral rollup</p>
          </>
        )}
      </div>

      {balance !== null && balance > 0 && (
        <div className="bg-gp-green/5 border border-gp-green/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gp-green shrink-0" />
          <span className="font-mono text-[10px] text-gp-green">
            Funds visible only to you via TEE-gated access
          </span>
        </div>
      )}
    </div>
  );
}
