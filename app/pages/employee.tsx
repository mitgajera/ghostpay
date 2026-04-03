import { useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { APP_NAME } from "../constants";
import { useTeeAuth } from "../hooks/useTeeAuth";
import { usePrivateBalance } from "../hooks/usePrivateBalance";
import PrivateBalance from "../components/PrivateBalance";
import WithdrawButton, { WithdrawLog } from "../components/WithdrawButton";

export default function EmployeePage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { authToken, teeVerified, loading: authLoading, error: authError, authorize } = useTeeAuth();
  const { balance, refresh } = usePrivateBalance(authToken?.token ?? null);
  const [log, setLog] = useState<WithdrawLog[]>([]);

  function appendLog(entry: WithdrawLog) {
    setLog((prev) => [entry, ...prev].slice(0, 50));
  }

  if (!publicKey) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-3xl font-bold text-white">{APP_NAME} — Employee</h1>
        <p className="text-gray-400 text-sm">Connect your wallet to view your private balance.</p>
        <WalletMultiButton />
        <button onClick={() => router.push("/")} className="text-gray-600 text-xs hover:text-gray-400">
          ← Back
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-gray-500 text-xs mt-0.5">Employee dashboard</p>
        </div>
        <WalletMultiButton />
      </div>

      {/* Wallet address */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-gray-500 text-xs">Wallet</span>
        <span className="text-gray-300 font-mono text-xs">
          {publicKey.toBase58().slice(0, 8)}…{publicKey.toBase58().slice(-6)}
        </span>
      </div>

      {/* TEE auth banner */}
      <div className={`rounded-lg px-4 py-3 flex items-center justify-between text-sm ${
        teeVerified === null
          ? "bg-gray-800/50 border border-gray-700"
          : teeVerified
          ? "bg-green-900/30 border border-green-700/50"
          : "bg-red-900/30 border border-red-700/50"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            teeVerified === null ? "bg-gray-500" : teeVerified ? "bg-green-400" : "bg-red-400"
          }`} />
          <span className={
            teeVerified ? "text-green-300" : teeVerified === false ? "text-red-300" : "text-gray-400"
          }>
            {teeVerified === null
              ? "TEE not verified"
              : teeVerified
              ? "TEE verified — Intel TDX"
              : "TEE verification failed"}
          </span>
        </div>
        {!authToken && (
          <button
            onClick={authorize}
            disabled={authLoading}
            className="text-xs bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
          >
            {authLoading ? "Verifying…" : "Authorize TEE"}
          </button>
        )}
      </div>

      {authError && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-red-300 text-sm">
          {authError}
        </div>
      )}

      {/* Private balance */}
      <PrivateBalance authToken={authToken?.token ?? null} />

      {/* Withdraw */}
      <WithdrawButton
        authToken={authToken?.token ?? null}
        privateBalance={balance}
        onLog={appendLog}
        onDone={refresh}
      />

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Log</h2>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto font-mono text-xs">
            {log.map((entry, i) => (
              <div key={i} className={`flex gap-2 ${
                entry.level === "ok" ? "text-green-400" :
                entry.level === "error" ? "text-red-400" : "text-gray-400"
              }`}>
                <span className="text-gray-600 shrink-0">
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex gap-4 text-xs text-center justify-center">
        <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-400">
          ← Home
        </button>
        <button onClick={() => router.push("/employer")} className="text-purple-600 hover:text-purple-400">
          Employer view →
        </button>
      </div>
    </main>
  );
}
