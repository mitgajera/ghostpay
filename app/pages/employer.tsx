import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { APP_NAME, CURRENCIES } from "../constants";
import { useTeeAuth } from "../hooks/useTeeAuth";
import { usePrivateBalance } from "../hooks/usePrivateBalance";
import { getPublicBalance } from "../lib/per-api";
import { getRate } from "../lib/fx-rates";
import { Recipient, FxDisplay } from "../types";
import { Currency } from "../constants";
import RecipientList from "../components/RecipientList";
import PayrollButton, { LogEntry } from "../components/PayrollButton";
import ExplorerPanel from "../components/ExplorerPanel";

interface ExplorerData {
  sig: string;
  recipientCount: number;
  totalUsdc: number;
}

function TeeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gp-green" />
      <span className="font-mono text-xs text-gp-green">TEE verified</span>
    </span>
  );
}

export default function EmployerPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { authToken, teeVerified, loading: authLoading, error: authError, authorize } = useTeeAuth();
  const { balance: privateBalance } = usePrivateBalance(authToken?.token ?? null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [publicBalance, setPublicBalance] = useState<number | null>(null);
  const [fxRates, setFxRates] = useState<Partial<Record<Currency, number>>>({});
  const [explorer, setExplorer] = useState<ExplorerData | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    getPublicBalance(publicKey.toBase58())
      .then((r) => setPublicBalance(Number(r.balance)))
      .catch(() => {});
  }, [publicKey]);

  useEffect(() => {
    for (const c of CURRENCIES) {
      getRate(c).then((r) => setFxRates((p) => ({ ...p, [c]: r.rate }))).catch(() => {});
    }
  }, []);

  function appendLog(entry: LogEntry) {
    setLog((prev) => [entry, ...prev].slice(0, 100));
  }

  const breakdown: FxDisplay[] = CURRENCIES.flatMap((c) => {
    const total = recipients.filter((r) => r.currency === c).reduce((s, r) => s + r.amountUsdc, 0);
    if (total === 0) return [];
    const rate = fxRates[c] ?? 0;
    return [{ currency: c, rate, localAmount: rate ? `${((total / 1_000_000) * rate).toFixed(2)} ${c}` : `— ${c}` }];
  });

  const totalUsdc = recipients.reduce((s, r) => s + r.amountUsdc, 0);

  if (!publicKey) {
    return (
      <main className="min-h-screen bg-gp-black flex flex-col items-center justify-center gap-8 px-6">
        <h1 className="font-display font-bold text-5xl text-gp-white tracking-tight">
          Ghost<span style={{ opacity: 0.35 }}>Pay</span>
        </h1>
        <p className="font-mono text-sm text-gp-ghost-dim">Connect your wallet to run payroll.</p>
        <WalletMultiButton />
        <button onClick={() => router.push("/")} className="font-mono text-xs text-gp-border-2 hover:text-gp-ghost-dim transition-colors mt-4">
          ← Back
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gp-black px-4 py-10 max-w-4xl mx-auto flex flex-col gap-8">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl text-gp-white tracking-tight leading-none">
            Ghost<span style={{ opacity: 0.35 }}>Pay</span>
          </h1>
          <p className="font-mono text-xs text-gp-ghost-dim mt-1">Employer</p>
        </div>
        <div className="flex items-center gap-4">
          {teeVerified && <TeeBadge />}
          <div className="text-right hidden sm:block">
            <p className="font-mono text-[10px] text-gp-ghost-dim uppercase tracking-widest">Public balance</p>
            <p className="font-mono text-sm text-gp-white">
              {publicBalance !== null ? `${(publicBalance / 1_000_000).toFixed(2)} USDC` : "—"}
            </p>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      {/* ── TEE auth strip ──────────────────────────────────────────── */}
      <div className={`rounded-lg border px-4 py-3 flex items-center justify-between ${
        teeVerified ? "border-gp-green/30 bg-gp-green/5" : "border-gp-border bg-gp-surface"
      }`}>
        <div className="flex items-center gap-3 font-mono text-xs">
          {teeVerified
            ? <TeeBadge />
            : <span className="text-gp-ghost-dim">TEE not verified</span>}
          {authToken && privateBalance !== null && (
            <span className="text-gp-ghost-dim hidden sm:inline">
              · private balance: <span className="text-gp-white">{(privateBalance / 1_000_000).toFixed(2)} USDC</span>
            </span>
          )}
        </div>
        {!authToken ? (
          <button
            onClick={authorize}
            disabled={authLoading}
            className="font-display font-semibold text-xs bg-gp-green text-gp-white px-3 py-1.5 rounded-md transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {authLoading ? "Verifying…" : "Authorize TEE"}
          </button>
        ) : (
          <span className="font-mono text-[10px] text-gp-green/60 uppercase tracking-widest">
            {APP_NAME} · authenticated
          </span>
        )}
      </div>

      {authError && (
        <p className="font-mono text-xs text-red-400 border border-red-900/40 bg-red-950/20 rounded-lg px-4 py-3">
          {authError}
        </p>
      )}

      {/* ── Recipients ──────────────────────────────────────────────── */}
      <section className="bg-gp-surface border border-gp-border rounded-xl p-6">
        <h2 className="font-display font-semibold text-gp-white mb-5">Recipients</h2>
        <RecipientList recipients={recipients} onChange={setRecipients} fxRates={fxRates} />
      </section>

      {/* ── Payroll summary ─────────────────────────────────────────── */}
      <section className="bg-gp-surface border border-gp-border rounded-xl p-6 flex flex-col gap-5">
        <h2 className="font-display font-semibold text-gp-white">Payroll</h2>

        {breakdown.length > 0 && (
          <div className="space-y-2">
            {breakdown.map((b) => (
              <div key={b.currency} className="flex justify-between font-mono text-xs">
                <span className="text-gp-ghost-dim">{b.currency}</span>
                <span className="text-gp-ghost">{b.localAmount}</span>
              </div>
            ))}
            <div className="border-t border-gp-border pt-2 flex justify-between font-mono text-sm">
              <span className="text-gp-ghost-dim uppercase tracking-widest text-[10px] self-center">Total USDC</span>
              <span className="font-display font-bold text-gp-white text-lg">
                {(totalUsdc / 1_000_000).toFixed(2)}
                <span className="font-mono font-normal text-gp-ghost-dim text-xs ml-1.5">USDC</span>
              </span>
            </div>
          </div>
        )}

        {!authToken && recipients.length > 0 && (
          <p className="font-mono text-xs text-gp-ghost-dim border border-gp-border rounded-lg px-3 py-2">
            Authorize TEE above before running payroll.
          </p>
        )}

        <PayrollButton
          recipients={recipients}
          authToken={authToken?.token ?? null}
          onLog={appendLog}
          onDepositConfirmed={(sig, count, total) => setExplorer({ sig, recipientCount: count, totalUsdc: total })}
          onDone={() => {
            getPublicBalance(publicKey.toBase58()).then((r) => setPublicBalance(Number(r.balance))).catch(() => {});
          }}
        />
      </section>

      {/* ── Explorer panel (appears after payroll) ──────────────────── */}
      {explorer && (
        <ExplorerPanel
          depositSig={explorer.sig}
          senderAddress={publicKey.toBase58()}
          recipientCount={explorer.recipientCount}
          totalUsdc={explorer.totalUsdc}
        />
      )}

      {/* ── Status log ──────────────────────────────────────────────── */}
      {log.length > 0 && (
        <section className="bg-gp-surface border border-gp-border rounded-xl p-6">
          <h2 className="font-display font-semibold text-gp-white mb-4">Log</h2>
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto font-mono text-xs">
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
        <button onClick={() => router.push("/employee")} className="hover:text-gp-ghost-dim transition-colors">Employee →</button>
      </nav>

    </main>
  );
}
