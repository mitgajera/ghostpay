import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTeeAuth } from "../hooks/useTeeAuth";
import { usePrivateBalance } from "../hooks/usePrivateBalance";
import { getPayments } from "../lib/history";
import { PaymentRecord } from "../types";
import PrivateBalance from "../components/PrivateBalance";
import WithdrawButton, { WithdrawLog } from "../components/WithdrawButton";
import PayslipCard from "../components/PayslipCard";
import TabBar from "../components/TabBar";

type Tab = "balance" | "payments";

function TeeDot({ verified }: { verified: boolean | null }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gp-green animate-pulse-dot" />
      <span className="font-mono text-[10px] text-gp-green uppercase tracking-[0.12em]">TEE verified</span>
    </span>
  );
}

function Toast({ level, msg, onDismiss }: { level: "ok"|"error"|"info"; msg: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const color = level === "ok" ? "border-gp-green/30 text-gp-green bg-gp-green/5"
    : level === "error" ? "border-red-900/30 text-red-400/80 bg-red-950/10"
    : "border-gp-border-2 text-gp-ghost-dim bg-gp-surface-2";

  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border font-mono text-xs max-w-xs animate-slide-up ${color}`}>
      {msg}
    </div>
  );
}

export default function EmployeePage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { authToken, teeVerified, loading: authLoading, error: authError, authorize } = useTeeAuth();
  const { balance, refresh } = usePrivateBalance(authToken?.token ?? null);

  const [tab, setTab]   = useState<Tab>("balance");
  const [log, setLog]   = useState<WithdrawLog[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [toast, setToast] = useState<{ level: "ok"|"error"|"info"; msg: string } | null>(null);

  // Load payments when tab switches or wallet changes
  useEffect(() => {
    if (!publicKey) return;
    setPayments(getPayments(publicKey.toBase58()));
  }, [publicKey, tab]);

  const tabs = [
    { id: "balance",  label: "Balance" },
    { id: "payments", label: "Payments", badge: payments.length || undefined },
  ];

  if (!publicKey) {
    return (
      <main className="flex-1 bg-gp-black flex flex-col items-center justify-center gap-6 px-6 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(26,122,74,0.06) 0%, transparent 100%)" }} />
        <div className="relative flex flex-col items-center gap-5 animate-fade-in text-center max-w-sm">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gp-green animate-pulse-dot" />
            <span className="font-mono text-[10px] text-gp-green uppercase tracking-[0.18em]">Employee Portal</span>
          </div>
          <h1 className="font-display font-extrabold text-gp-white tracking-tight select-none leading-none"
            style={{ fontSize: "clamp(48px,10vw,80px)", letterSpacing: "-0.03em" }}>
            Ghost<span style={{ opacity: 0.22 }}>Pay</span>
          </h1>
          <p className="font-mono text-xs text-gp-ghost-dim/70 leading-relaxed">
            View your private balance · Withdraw · Download payslips
          </p>
          <WalletMultiButton />
          <div className="flex items-center gap-4 font-mono text-[10px] text-gp-border-3 mt-1">
            <button onClick={() => router.push("/")} className="hover:text-gp-ghost-dim transition-colors">← Home</button>
            <span className="text-gp-border-2">·</span>
            <button onClick={() => router.push("/employer")} className="hover:text-gp-ghost-dim transition-colors">Employer →</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gp-black overflow-hidden">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <header className="shrink-0 z-20 bg-gp-black/95 backdrop-blur-sm border-b border-gp-border flex items-center justify-between px-6 h-14">
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
          <div className="wallet-header"><WalletMultiButton /></div>
        </div>
      </header>

      {/* ── Page body ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <main className="px-4 sm:px-6 pt-8 pb-24 max-w-lg mx-auto w-full flex flex-col gap-6">

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

        {/* ── Tab card ──────────────────────────────────────────────── */}
        <div className="gp-card overflow-hidden">
          <TabBar tabs={tabs} active={tab} onChange={(id) => setTab(id as Tab)} />

          <div className="px-6 py-6">

            {/* ── Balance tab ──────────────────────────────────────── */}
            {tab === "balance" && (
              <div className="flex flex-col gap-5">
                <PrivateBalance authToken={authToken?.token ?? null} />

                <WithdrawButton
                  authToken={authToken?.token ?? null}
                  privateBalance={balance}
                  onLog={(e) => setLog((p) => [e, ...p].slice(0, 50))}
                  onDone={refresh}
                />

                {/* Withdraw log */}
                {log.length > 0 && (
                  <div className="border-t border-gp-border pt-5">
                    <div className="flex items-center justify-between mb-3">
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
                  </div>
                )}
              </div>
            )}

            {/* ── Payments tab ─────────────────────────────────────── */}
            {tab === "payments" && (
              <div className="flex flex-col gap-3">
                {payments.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="font-mono text-xs text-gp-border-3">No payments received yet.</p>
                    <p className="font-mono text-[10px] text-gp-border-3/60 mt-1">Payments will appear here after an employer runs payroll to your wallet.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <p className="gp-section-title">Payment history</p>
                      <span className="font-mono text-[10px] text-gp-border-3">
                        {payments.length} payment{payments.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {payments.map((p) => (
                      <PayslipCard key={p.txSig} payment={p} />
                    ))}
                    <div className="border-t border-gp-border pt-4 flex justify-between font-mono text-xs">
                      <span className="text-gp-ghost-dim/50 uppercase tracking-widest text-[9px]">Total received</span>
                      <span className="text-gp-green font-semibold">
                        {(payments.reduce((s, p) => s + p.amountUsdc, 0) / 1_000_000).toFixed(6)} USDC
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Footer nav */}
        <nav className="flex justify-center gap-8 font-mono text-[10px] text-gp-border-3 uppercase tracking-[0.16em] pt-2">
          <button onClick={() => router.push("/")}        className="hover:text-gp-ghost-dim/60 transition-colors">← Home</button>
          <button onClick={() => router.push("/employer")} className="hover:text-gp-ghost-dim/60 transition-colors">Employer →</button>
        </nav>

      </main>
      </div>

      {/* Toast */}
      {toast && (
        <Toast level={toast.level} msg={toast.msg} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
