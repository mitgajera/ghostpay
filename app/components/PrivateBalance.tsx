import { usePrivateBalance } from "../hooks/usePrivateBalance";

interface Props {
  authToken: string | null;
}

export default function PrivateBalance({ authToken }: Props) {
  const { balance, loading, refresh } = usePrivateBalance(authToken);

  const display =
    balance === null
      ? "—"
      : `${(balance / 1_000_000).toFixed(6)} USDC`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Private Balance</h2>
        <button
          onClick={refresh}
          disabled={loading || !authToken}
          className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="text-center py-4">
        <span className={`text-3xl font-bold font-mono ${
          balance === null ? "text-gray-600" : "text-cyan-400"
        }`}>
          {display}
        </span>
        {balance !== null && balance > 0 && (
          <p className="text-gray-500 text-xs mt-1">Inside TEE ephemeral rollup</p>
        )}
        {!authToken && (
          <p className="text-gray-600 text-xs mt-1">Authorize TEE to view balance</p>
        )}
      </div>
    </div>
  );
}
