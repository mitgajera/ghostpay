import { useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTeeAuth } from "../hooks/useTeeAuth";
import { usePrivateBalance } from "../hooks/usePrivateBalance";
import PrivateBalance from "../components/PrivateBalance";
import WithdrawButton, { WithdrawLog } from "../components/WithdrawButton";

function TeeDot({ verified }: { verified: boolean | null }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gp-green animate-pulse-dot" />
      <span className="font-mono text-[10px] text-gp-green uppercase tracking-[0.12em]">TEE verified</span>
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
        <h1 className="font-display font-extrabold text-gp-white tracking-tight select-none" style={{ fontSize: "clamp(48px,10vw,96px)" }}>
          Ghost<span style={{ opacity: 0.28 }}>Pay</span>
        </h1>
        <p className="font-mono text-xs text-gp-ghost-dim tracking-wide">Connect to view your private balance.</p>
        <WalletMultiButton />
        <button onClick={() => router.push("/")} className="font-mono text-[10px] text-gp-border-3 hover:text-gp-ghost-dim transition-colors uppercase tracking-widest">
          ← Back
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gp-black flex flex-col">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-gp-black/95 backdrop-blur-sm border-b border-gp-border flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push("/")} className="font-display font-bold text-xl text-gp-white tracking-tight leading-none select-none hover:opacity-80 transition-opacity">
            Ghost<span style={{ opacity: 0.28 }}>Pay</span>
          </button>
          <span className="font-mono text-[9px] text-gp-border-3 uppercase tracking-[0.18em] hidden sm:block">Employee</span>
          {teeVerified && <TeeDot verified={teeVerified} />}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-gp-border-3 hidden sm:block">
            {publicKey.toBase58().slice(0, 6)}…{publicKey.toBase58().slice(-4)}
          </span>
          <WalletMultiButton />
        </div>
      </header>

      {/* ── Page body ─────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-lg mx-auto w-full flex flex-col gap-6">

        {/* TEE auth strip */}
        <div className={`rounded-xl border px-4 py-3 flex items-center justify-between transition-colors ${
          teeVerified ? "border-gp-green/20 bg-gp-green/5" : "border-gp-border bg-gp-surface"
        }`}>
          <div className="flex items-center gap-3">
            {teeVerified
              ? <TeeDot verified={true} />
              : <span className="font-mono text-xs text-gp-ghost-dim/50">TEE not verified</span>}
          </div>
          {!authToken ? (
            <button
              onClick={authorize}
              disabled={authLoading}
              className="font-display font-semibold text-xs bg-gp-green text-gp-white px-4 py-1.5 rounded-lg hover:bg-gp-green-2 transition-colors disabled:opacity-40"
            >
              {authLoading ? "Verifying…" : "Authorize TEE"}
            </button>
          ) : (
            <span className="font-mono text-[9px] text-gp-green/40 uppercase tracking-widest">
              Authenticated
            </span>
          )}
        </div>

        {authError && (
          <div className="rounded-xl border border-red-900/30 bg-red-950/15 px-4 py-3">
            <p className="font-mono text-xs text-red-400/80">{authError}</p>
          </div>
        )}

        {/* Balance — hero */}
        <PrivateBalance authToken={authToken?.token ?? null} />

        {/* Withdraw */}
        <WithdrawButton
          authToken={authToken?.token ?? null}
          privateBalance={balance}
          onLog={(e) => setLog((p) => [e, ...p].slice(0, 50))}
          onDone={refresh}
        />

        {/* Log */}
        {log.length > 0 && (
          <section className="gp-card px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <p className="gp-section-title">Log</p>
              <button onClick={() => setLog([])} className="font-mono text-[9px] text-gp-border-3 hover:text-gp-ghost-dim/50 uppercase tracking-widest transition-colors">
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto font-mono text-[11px]">
              {log.map((e, i) => (
                <div key={i} className={`flex gap-4 py-0.5 ${
                  e.level === "ok"    ? "text-gp-green" :
                  e.level === "error" ? "text-red-400/80" : "text-gp-ghost-dim/60"
                }`}>
                  <span className="text-gp-border-3 shrink-0 tabular-nums">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span>{e.msg}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer nav */}
        <nav className="flex justify-center gap-8 font-mono text-[10px] text-gp-border-3 uppercase tracking-[0.16em] pt-2">
          <button onClick={() => router.push("/")}        className="hover:text-gp-ghost-dim/60 transition-colors">← Home</button>
          <button onClick={() => router.push("/employer")} className="hover:text-gp-ghost-dim/60 transition-colors">Employer →</button>
        </nav>

      </main>
    </div>
  );
}
