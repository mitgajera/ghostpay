import { useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTeeAuth } from "../hooks/useTeeAuth";
import { usePrivateBalance } from "../hooks/usePrivateBalance";
import PrivateBalance from "../components/PrivateBalance";
import WithdrawButton, { WithdrawLog } from "../components/WithdrawButton";

function TeeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gp-green" />
      <span className="font-mono text-xs text-gp-green">TEE verified</span>
    </span>
  );
}

export default function EmployeePage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { authToken, teeVerified, loading: authLoading, error: authError, authorize } = useTeeAuth();
  const { balance, refresh } = usePrivateBalance(authToken?.token ?? null);
  const [log, setLog] = useState<WithdrawLog[]>([]);

  if (!publicKey) {
    return (
      <main className="min-h-screen bg-gp-black flex flex-col items-center justify-center gap-8 px-6">
        <h1 className="font-display font-bold text-5xl text-gp-white tracking-tight">
          Ghost<span style={{ opacity: 0.35 }}>Pay</span>
        </h1>
        <p className="font-mono text-sm text-gp-ghost-dim">Connect your wallet to view your balance.</p>
        <WalletMultiButton />
        <button onClick={() => router.push("/")} className="font-mono text-xs text-gp-border-2 hover:text-gp-ghost-dim transition-colors mt-4">
          ← Back
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gp-black px-4 py-10 max-w-lg mx-auto flex flex-col gap-8">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-gp-white tracking-tight leading-none">
            Ghost<span style={{ opacity: 0.35 }}>Pay</span>
          </h1>
          <p className="font-mono text-xs text-gp-ghost-dim mt-1">Employee</p>
        </div>
        <div className="flex items-center gap-3">
          {teeVerified && <TeeBadge />}
          <WalletMultiButton />
        </div>
      </header>

      {/* ── Wallet strip ────────────────────────────────────────────── */}
      <div className="bg-gp-surface border border-gp-border rounded-lg px-4 py-3 flex justify-between font-mono text-xs">
        <span className="text-gp-ghost-dim uppercase tracking-widest text-[10px] self-center">Wallet</span>
        <span className="text-gp-ghost">{publicKey.toBase58().slice(0, 8)}…{publicKey.toBase58().slice(-6)}</span>
      </div>

      {/* ── TEE auth ────────────────────────────────────────────────── */}
      <div className={`rounded-lg border px-4 py-3 flex items-center justify-between ${
        teeVerified ? "border-gp-green/30 bg-gp-green/5" : "border-gp-border bg-gp-surface"
      }`}>
        <div className="font-mono text-xs">
          {teeVerified ? <TeeBadge /> : <span className="text-gp-ghost-dim">TEE not verified</span>}
        </div>
        {!authToken && (
          <button
            onClick={authorize}
            disabled={authLoading}
            className="font-display font-semibold text-xs bg-gp-green text-gp-white px-3 py-1.5 rounded-md transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {authLoading ? "Verifying…" : "Authorize TEE"}
          </button>
        )}
        {authToken && (
          <span className="font-mono text-[10px] text-gp-green/60 uppercase tracking-widest">authenticated</span>
        )}
      </div>

      {authError && (
        <p className="font-mono text-xs text-red-400 border border-red-900/40 bg-red-950/20 rounded-lg px-4 py-3">
          {authError}
        </p>
      )}

      {/* ── Private balance ─────────────────────────────────────────── */}
      <PrivateBalance authToken={authToken?.token ?? null} />

      {/* ── Withdraw ────────────────────────────────────────────────── */}
      <WithdrawButton
        authToken={authToken?.token ?? null}
        privateBalance={balance}
        onLog={(e) => setLog((prev) => [e, ...prev].slice(0, 50))}
        onDone={refresh}
      />

      {/* ── Log ─────────────────────────────────────────────────────── */}
      {log.length > 0 && (
        <section className="bg-gp-surface border border-gp-border rounded-xl p-6">
          <h2 className="font-display font-semibold text-gp-white mb-4">Log</h2>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto font-mono text-xs">
            {log.map((e, i) => (
              <div key={i} className={`flex gap-3 ${
                e.level === "ok" ? "text-gp-green" : e.level === "error" ? "text-red-400" : "text-gp-ghost-dim"
              }`}>
                <span className="text-gp-border-2 shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
                <span>{e.msg}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="flex justify-center gap-8 font-mono text-xs text-gp-border-2">
        <button onClick={() => router.push("/")} className="hover:text-gp-ghost-dim transition-colors">← Home</button>
        <button onClick={() => router.push("/employer")} className="hover:text-gp-ghost-dim transition-colors">Employer →</button>
      </nav>

    </main>
  );
}
