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

export default function EmployerPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { authToken, teeVerified, loading: authLoading, error: authError, authorize } = useTeeAuth();
  const { balance: privateBalance, loading: balLoading } = usePrivateBalance(authToken?.token ?? null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [publicBalance, setPublicBalance] = useState<number | null>(null);
  const [fxRates, setFxRates] = useState<Partial<Record<Currency, number>>>({});

  // Fetch public USDC balance
  useEffect(() => {
    if (!publicKey) return;
    getPublicBalance(publicKey.toBase58())
      .then((r) => setPublicBalance(Number(r.balance)))
      .catch(() => {});
  }, [publicKey]);

  // Prefetch FX rates
  useEffect(() => {
    for (const c of CURRENCIES) {
      getRate(c)
        .then((r) => setFxRates((prev) => ({ ...prev, [c]: r.rate })))
        .catch(() => {});
    }
  }, []);

  function appendLog(entry: LogEntry) {
    setLog((prev) => [entry, ...prev].slice(0, 100));
  }

  // Currency breakdown for payroll summary
  const breakdown: FxDisplay[] = CURRENCIES.flatMap((c) => {
    const total = recipients
      .filter((r) => r.currency === c)
      .reduce((s, r) => s + r.amountUsdc, 0);
    if (total === 0) return [];
    const rate = fxRates[c] ?? 0;
    return [{
      currency: c,
      rate,
      localAmount: rate
        ? `${((total / 1_000_000) * rate).toFixed(2)} ${c}`
        : `— ${c}`,
    }];
  });

  const totalUsdc = recipients.reduce((s, r) => s + r.amountUsdc, 0);

  if (!publicKey) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-3xl font-bold text-white">{APP_NAME} — Employer</h1>
        <p className="text-gray-400 text-sm">Connect your wallet to continue.</p>
        <WalletMultiButton />
        <button onClick={() => router.push("/")} className="text-gray-600 text-xs hover:text-gray-400">
          ← Back
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-4 py-8 max-w-4xl mx-auto gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-gray-500 text-xs mt-0.5">Employer dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Public balance</p>
            <p className="text-sm font-mono text-white">
              {publicBalance !== null
                ? `${(publicBalance / 1_000_000).toFixed(2)} USDC`
                : "…"}
            </p>
          </div>
          <WalletMultiButton />
        </div>
      </div>

      {/* Wallet */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-gray-500 text-xs">Wallet</span>
        <span className="text-gray-300 font-mono text-xs">
          {publicKey.toBase58().slice(0, 8)}…{publicKey.toBase58().slice(-6)}
        </span>
      </div>

      {/* TEE status banner */}
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
          <span className={teeVerified ? "text-green-300" : teeVerified === false ? "text-red-300" : "text-gray-400"}>
            {teeVerified === null
              ? "TEE not verified"
              : teeVerified
              ? "TEE verified — Intel TDX attestation passed ✓"
              : "TEE verification failed"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {authToken && (
            <span className="text-xs text-gray-400">
              Private:{" "}
              <span className="text-cyan-400 font-mono">
                {balLoading ? "…" : privateBalance !== null ? `${(privateBalance / 1_000_000).toFixed(2)} USDC` : "—"}
              </span>
            </span>
          )}
          {!authToken && (
            <button
              onClick={authorize}
              disabled={authLoading}
              className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
            >
              {authLoading ? "Verifying…" : "Authorize TEE"}
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
          {authError}
        </div>
      )}

      {/* Recipient list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Recipients</h2>
        <RecipientList recipients={recipients} onChange={setRecipients} />
      </div>

      {/* Payroll summary + Run Payroll */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-white font-semibold">Payroll Summary</h2>

        {recipients.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Currency breakdown */}
            {breakdown.map((b) => (
              <div key={b.currency} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{b.currency} recipients</span>
                <span className="text-cyan-400 font-mono text-xs">{b.localAmount}</span>
              </div>
            ))}
            <div className="border-t border-gray-800 pt-2 flex items-center justify-between text-sm">
              <span className="text-gray-300 font-medium">Total USDC</span>
              <span className="text-white font-mono font-bold">
                {(totalUsdc / 1_000_000).toFixed(2)} USDC
              </span>
            </div>
            <p className="text-gray-600 text-xs">
              {recipients.length} recipient{recipients.length !== 1 ? "s" : ""} · transfers go directly from your wallet — individual amounts hidden on-chain
            </p>
          </div>
        )}

        {!authToken && recipients.length > 0 && (
          <p className="text-yellow-600 text-xs">
            Authorize TEE before running payroll.
          </p>
        )}

        <PayrollButton
          recipients={recipients}
          authToken={authToken?.token ?? null}
          onLog={appendLog}
          onDone={() => {
            // Refresh public balance after payroll
            getPublicBalance(publicKey.toBase58())
              .then((r) => setPublicBalance(Number(r.balance)))
              .catch(() => {});
          }}
        />
      </div>

      {/* Status log */}
      {log.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Log</h2>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto font-mono text-xs">
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
        <button onClick={() => router.push("/employee")} className="text-cyan-600 hover:text-cyan-400">
          Employee view →
        </button>
      </div>
    </main>
  );
}
