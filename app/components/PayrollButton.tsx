import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { Recipient } from "../types";
import { buildDeposit, buildPrivateTransfer, signAndSend } from "../lib/per-api";
import { teeUrl } from "../lib/auth";
import { saveBatch } from "../lib/history";
import { savePayment } from "../lib/history";
import { usdcToLocal } from "../lib/fx-rates";

export interface LogEntry {
  ts: number;
  level: "info" | "ok" | "error";
  msg: string;
}

interface Props {
  recipients: Recipient[];
  authToken: string | null;
  fxRates: Partial<Record<string, number>>;
  onLog: (entry: LogEntry) => void;
  onDepositConfirmed?: (sig: string, recipientCount: number, totalUsdc: number) => void;
  onDone: () => void;
}

export default function PayrollButton({ recipients, authToken, fxRates, onLog, onDepositConfirmed, onDone }: Props) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<"idle" | "depositing" | "transferring">("idle");

  const log = useCallback(
    (level: LogEntry["level"], msg: string) => onLog({ ts: Date.now(), level, msg }),
    [onLog]
  );

  async function runPayroll() {
    if (!publicKey || !signTransaction || !authToken) return;
    setRunning(true);
    setStep("depositing");

    const teeConn    = new Connection(teeUrl(authToken), "confirmed");
    const sender     = publicKey.toBase58();
    const total      = recipients.reduce((s, r) => s + r.amountUsdc, 0);
    const batchId    = crypto.randomUUID();
    const batchDate  = Date.now();

    log("info", `Starting payroll — ${recipients.length} recipient(s) · ${(total / 1_000_000).toFixed(2)} USDC`);

    // ── Step 1: Deposit ──────────────────────────────────────────
    let depositSig = "";
    try {
      log("info", `Depositing ${(total / 1_000_000).toFixed(2)} USDC → Private Ephemeral Rollup…`);
      const payload = await buildDeposit(sender, total);
      depositSig = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
      await connection.confirmTransaction(depositSig, "confirmed");
      log("ok", `Deposit confirmed · ${depositSig.slice(0, 12)}… · only total visible on Solana`);
      onDepositConfirmed?.(depositSig, recipients.length, total);
    } catch (e: any) {
      log("error", `Deposit failed — ${e.message}`);
      setRunning(false);
      setStep("idle");
      return;
    }

    // ── Step 2: Private transfers ────────────────────────────────
    setStep("transferring");
    let failed = 0;
    const paidRecipients: typeof recipients = [];

    for (const r of recipients) {
      try {
        log("info", `→ ${r.name}  ${(r.amountUsdc / 1_000_000).toFixed(2)} USDC`);
        const payload = await buildPrivateTransfer(sender, r.wallet, r.amountUsdc, authToken);
        const sig     = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));

        // Save payment record for employee dashboard
        const rate       = fxRates[r.currency] ?? 0;
        const localAmt   = rate ? usdcToLocal(r.amountUsdc, rate, r.currency) : "";
        savePayment({
          batchId,
          employerWallet:  sender,
          recipientWallet: r.wallet,
          amountUsdc:      r.amountUsdc,
          currency:        r.currency,
          localAmount:     localAmt,
          date:            Date.now(),
          txSig:           sig,
        });

        log("ok", `  Sent to ${r.name} ✓  ${sig.slice(0, 12)}…`);
        paidRecipients.push(r);
      } catch (e: any) {
        log("error", `  ✗ ${r.name} — ${e.message}`);
        failed++;
      }
    }

    // ── Save batch record for employer history ───────────────────
    saveBatch({
      id:              batchId,
      employerWallet:  sender,
      date:            batchDate,
      totalUsdc:       total,
      recipientCount:  recipients.length,
      depositSig,
      settled:         failed === 0,
      recipients:      recipients.map((r) => ({
        name:       r.name,
        wallet:     r.wallet,
        amountUsdc: r.amountUsdc,
        currency:   r.currency,
      })),
    });

    if (failed === 0) {
      log("ok", "Payroll complete. Zero individual traces on Solana.");
    } else {
      log("error", `Done with ${failed} failure(s). Other recipients paid successfully.`);
    }

    setRunning(false);
    setStep("idle");
    onDone();
  }

  const disabled = !publicKey || !authToken || running || recipients.length === 0;
  const total    = recipients.reduce((s, r) => s + r.amountUsdc, 0);

  const label = running
    ? step === "depositing" ? "Depositing…" : "Transferring privately…"
    : recipients.length === 0
    ? "Add recipients to continue"
    : `Run Payroll — ${(total / 1_000_000).toFixed(2)} USDC`;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={runPayroll}
        disabled={disabled}
        className={`
          relative w-full py-4 rounded-xl font-display font-bold text-sm tracking-wide
          transition-all duration-200 overflow-hidden
          ${disabled
            ? "bg-gp-surface-2 text-gp-border-3 border border-gp-border cursor-not-allowed"
            : "bg-gp-green text-gp-white hover:bg-gp-green-2 cursor-pointer shadow-[0_0_32px_rgba(26,122,74,0.18)]"
          }
        `}
      >
        {running && (
          <span className="absolute left-5 top-1/2 -translate-y-1/2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-gp-white/40 animate-pulse-dot"
                style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </span>
        )}
        {label}
      </button>
      {!authToken && recipients.length > 0 && (
        <p className="font-mono text-[10px] text-gp-ghost-dim/40 text-center tracking-wide">
          Authorize TEE above to enable payroll
        </p>
      )}
    </div>
  );
}
