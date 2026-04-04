import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { CURRENCIES } from "../constants";
import { useTeeAuth } from "../hooks/useTeeAuth";
import { usePrivateBalance } from "../hooks/usePrivateBalance";
import { getPublicBalance } from "../lib/per-api";
import { getRate } from "../lib/fx-rates";
import { getSchedules } from "../lib/schedule";
import { isDue } from "../lib/schedule";
import { Recipient, FxDisplay } from "../types";
import { Currency } from "../constants";
import RecipientList from "../components/RecipientList";
import PayrollButton, { LogEntry } from "../components/PayrollButton";
import ExplorerPanel from "../components/ExplorerPanel";
import TabBar from "../components/TabBar";
import TemplateManager from "../components/TemplateManager";
import BatchHistory from "../components/BatchHistory";
import SchedulePanel from "../components/SchedulePanel";

interface ExplorerData { sig: string; recipientCount: number; totalUsdc: number; }

type Tab = "payroll" | "templates" | "history" | "schedule";

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

export default function EmployerPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { authToken, teeVerified, loading: authLoading, error: authError, authorize } = useTeeAuth();
  const { balance: privateBalance } = usePrivateBalance(authToken?.token ?? null);

  const [tab, setTab]             = useState<Tab>("payroll");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [log, setLog]             = useState<LogEntry[]>([]);
  const [publicBalance, setPublicBalance] = useState<number | null>(null);
  const [fxRates, setFxRates]     = useState<Partial<Record<Currency, number>>>({});
  const [explorer, setExplorer]   = useState<ExplorerData | null>(null);
  const [toast, setToast]         = useState<{ level: "ok"|"error"|"info"; msg: string } | null>(null);
  const [dueCount, setDueCount]   = useState(0);

  useEffect(() => {
    if (!publicKey) return;
    getPublicBalance(publicKey.toBase58())
      .then((r) => setPublicBalance(Number(r.balance)))
      .catch(() => {});
  }, [publicKey]);

  useEffect(() => {
    CURRENCIES.forEach((c) => {
      getRate(c).then((r) => setFxRates((p) => ({ ...p, [c]: r.rate }))).catch(() => {});
    });
  }, []);

  // Poll due schedules for badge
  useEffect(() => {
    function check() {
      const schedules = getSchedules();
      setDueCount(schedules.filter(isDue).length);
    }
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  const appendLog = (e: LogEntry) => setLog((p) => [e, ...p].slice(0, 100));
  const showToast = (level: "ok"|"error"|"info", msg: string) => setToast({ level, msg });

  const breakdown: FxDisplay[] = CURRENCIES.flatMap((c) => {
    const total = recipients.filter((r) => r.currency === c).reduce((s, r) => s + r.amountUsdc, 0);
    if (!total) return [];
    const rate = fxRates[c] ?? 0;
    return [{ currency: c, rate, localAmount: rate ? `${((total / 1_000_000) * rate).toFixed(2)} ${c}` : `— ${c}` }];
  });

  const totalUsdc = recipients.reduce((s, r) => s + r.amountUsdc, 0);

  const tabs = [
    { id: "payroll",   label: "Payroll",   badge: recipients.length || undefined },
    { id: "templates", label: "Templates" },
    { id: "history",   label: "History" },
    { id: "schedule",  label: "Schedule",  badge: dueCount || undefined },
  ];

  if (!publicKey) {
    return (
      <main className="min-h-screen bg-gp-black flex flex-col items-center justify-center gap-8 px-6">
        <h1 className="font-display font-extrabold text-gp-white tracking-tight select-none" style={{ fontSize: "clamp(48px,10vw,96px)" }}>
          Ghost<span style={{ opacity: 0.28 }}>Pay</span>
        </h1>
        <p className="font-mono text-xs text-gp-ghost-dim tracking-wide">Connect your wallet to run payroll.</p>
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
          <button onClick={() => router.push("/")} className="font-display font-bold text-xl text-gp-white tracking-tight select-none leading-none hover:opacity-80 transition-opacity">
            Ghost<span style={{ opacity: 0.28 }}>Pay</span>
          </button>
          <span className="font-mono text-[9px] text-gp-border-3 uppercase tracking-[0.18em] hidden sm:block">Employer</span>
          {teeVerified && <TeeDot verified={teeVerified} />}
        </div>
        <div className="flex items-center gap-4">
          {publicBalance !== null && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[9px] text-gp-border-3 uppercase tracking-widest">Public</span>
              <span className="font-mono text-xs text-gp-ghost-dim">{(publicBalance / 1_000_000).toFixed(2)} USDC</span>
            </div>
          )}
          {authToken && privateBalance !== null && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[9px] text-gp-border-3 uppercase tracking-widest">Private</span>
              <span className="font-mono text-xs text-gp-green">{(privateBalance / 1_000_000).toFixed(2)} USDC</span>
            </div>
          )}
          <WalletMultiButton />
        </div>
      </header>

      {/* ── Page body ─────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full flex flex-col gap-6">

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
              Authenticated · session active
            </span>
          )}
        </div>

        {authError && (
          <div className="rounded-xl border border-red-900/30 bg-red-950/15 px-4 py-3">
            <p className="font-mono text-xs text-red-400/80">{authError}</p>
          </div>
        )}

        {/* ── Tab navigation ──────────────────────────────────────── */}
        <div className="gp-card overflow-hidden">
          <TabBar tabs={tabs} active={tab} onChange={(id) => setTab(id as Tab)} />

          <div className="px-6 py-6">

            {/* ── Payroll tab ──────────────────────────────────────── */}
            {tab === "payroll" && (
              <div className="flex flex-col gap-6">
                <RecipientList
                  recipients={recipients}
                  onChange={setRecipients}
                  fxRates={fxRates}
                />

                {/* FX + payroll button */}
                <div className="border-t border-gp-border pt-5 flex flex-col gap-5">
                  {breakdown.length > 0 && (
                    <div className="space-y-2">
                      {breakdown.map((b) => (
                        <div key={b.currency} className="flex justify-between font-mono text-xs">
                          <span className="text-gp-ghost-dim/60 uppercase tracking-widest text-[9px] self-center">{b.currency}</span>
                          <span className="text-gp-ghost-dim">{b.localAmount}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-baseline border-t border-gp-border pt-3 mt-1">
                        <span className="font-mono text-[9px] text-gp-ghost-dim/50 uppercase tracking-widest">Total USDC</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-display font-extrabold text-2xl text-gp-white tracking-tight">
                            {(totalUsdc / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="font-mono text-[10px] text-gp-ghost-dim/50 uppercase">USDC</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <PayrollButton
                    recipients={recipients}
                    authToken={authToken?.token ?? null}
                    fxRates={fxRates}
                    onLog={appendLog}
                    onDepositConfirmed={(sig, count, total) =>
                      setExplorer({ sig, recipientCount: count, totalUsdc: total })
                    }
                    onDone={() => {
                      getPublicBalance(publicKey.toBase58())
                        .then((r) => setPublicBalance(Number(r.balance)))
                        .catch(() => {});
                      setRecipients([]);
                    }}
                  />
                </div>

                {/* Explorer panel — appears after payroll */}
                {explorer && (
                  <ExplorerPanel
                    depositSig={explorer.sig}
                    senderAddress={publicKey.toBase58()}
                    recipientCount={explorer.recipientCount}
                    totalUsdc={explorer.totalUsdc}
                  />
                )}

                {/* Log */}
                {log.length > 0 && (
                  <div className="border-t border-gp-border pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="gp-section-title">Activity log</p>
                      <button
                        onClick={() => setLog([])}
                        className="font-mono text-[9px] text-gp-border-3 hover:text-gp-ghost-dim/50 uppercase tracking-widest transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto font-mono text-[11px] space-y-px">
                      {log.map((e, i) => (
                        <div key={i} className={`flex gap-4 py-0.5 ${
                          e.level === "ok"    ? "text-gp-green" :
                          e.level === "error" ? "text-red-400/80" : "text-gp-ghost-dim/60"
                        }`}>
                          <span className="text-gp-border-3 shrink-0 tabular-nums">{new Date(e.ts).toLocaleTimeString()}</span>
                          <span className="leading-relaxed">{e.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Templates tab ────────────────────────────────────── */}
            {tab === "templates" && (
              <TemplateManager
                currentRecipients={recipients}
                onLoad={(recs) => { setRecipients(recs); setTab("payroll"); }}
                onToast={showToast}
              />
            )}

            {/* ── History tab ──────────────────────────────────────── */}
            {tab === "history" && (
              <BatchHistory
                onClone={(recs) => { setRecipients(recs); setTab("payroll"); }}
                onToast={showToast}
              />
            )}

            {/* ── Schedule tab ─────────────────────────────────────── */}
            {tab === "schedule" && (
              <SchedulePanel onToast={showToast} />
            )}

          </div>
        </div>

        {/* Footer nav */}
        <nav className="flex justify-center gap-8 font-mono text-[10px] text-gp-border-3 uppercase tracking-[0.16em] pt-2">
          <button onClick={() => router.push("/")}        className="hover:text-gp-ghost-dim/60 transition-colors">← Home</button>
          <button onClick={() => router.push("/employee")} className="hover:text-gp-ghost-dim/60 transition-colors">Employee →</button>
        </nav>

      </main>

      {/* Toast */}
      {toast && (
        <Toast level={toast.level} msg={toast.msg} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
