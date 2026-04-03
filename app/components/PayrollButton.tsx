import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { Recipient } from "../types";
import { buildDeposit, buildPrivateTransfer, signAndSend } from "../lib/per-api";
import { teeUrl } from "../lib/auth";

export interface LogEntry {
  ts: number;
  level: "info" | "ok" | "error";
  msg: string;
}

interface Props {
  recipients: Recipient[];
  authToken: string | null;
  onLog: (entry: LogEntry) => void;
  onDepositConfirmed?: (sig: string, recipientCount: number, totalUsdc: number) => void;
  onDone: () => void;
}

export default function PayrollButton({ recipients, authToken, onLog, onDepositConfirmed, onDone }: Props) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [running, setRunning] = useState(false);

  const log = useCallback(
    (level: LogEntry["level"], msg: string) => onLog({ ts: Date.now(), level, msg }),
    [onLog]
  );

  async function runPayroll() {
    if (!publicKey || !signTransaction || !authToken) return;
    setRunning(true);

    const teeConn = new Connection(teeUrl(authToken), "confirmed");
    const sender  = publicKey.toBase58();
    const total   = recipients.reduce((s, r) => s + r.amountUsdc, 0);

    log("info", `Starting payroll — ${recipients.length} recipient(s), ${(total / 1_000_000).toFixed(2)} USDC`);

    // ── Step 1: Deposit total into PER ──────────────────────────────
    let depositSig = "";
    try {
      log("info", `Depositing ${(total / 1_000_000).toFixed(2)} USDC → Private Ephemeral Rollup…`);
      const payload = await buildDeposit(sender, total);
      depositSig = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
      await connection.confirmTransaction(depositSig, "confirmed");
      log("ok", `Deposit confirmed — ${depositSig.slice(0, 12)}… · only total visible on Solana`);
      onDepositConfirmed?.(depositSig, recipients.length, total);
    } catch (e: any) {
      log("error", `Deposit failed — ${e.message}`);
      setRunning(false);
      return;
    }

    // ── Step 2: Private transfer to each recipient ──────────────────
    let failed = 0;
    for (const r of recipients) {
      try {
        log("info", `Sending privately → ${r.name} (${r.wallet.slice(0, 6)}…) ${(r.amountUsdc / 1_000_000).toFixed(2)} USDC`);
        const payload = await buildPrivateTransfer(sender, r.wallet, r.amountUsdc, authToken);
        const sig = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
        log("ok", `Sent privately to ${r.name} ✓  ${sig.slice(0, 12)}…`);
      } catch (e: any) {
        log("error", `✗ ${r.name} — ${e.message}`);
        failed++;
      }
    }

    if (failed === 0) {
      log("ok", "Payroll complete. Zero individual traces on Solana.");
    } else {
      log("error", `Done with ${failed} failure(s). Successful recipients were paid.`);
    }

    setRunning(false);
    onDone();
  }

  const disabled = !publicKey || !authToken || running || recipients.length === 0;
  const totalUsdc = recipients.reduce((s, r) => s + r.amountUsdc, 0);

  return (
    <button
      onClick={runPayroll}
      disabled={disabled}
      className={`
        w-full py-3.5 rounded-lg font-display font-semibold text-sm tracking-wide transition-all
        ${disabled
          ? "bg-gp-surface-2 text-gp-border-2 cursor-not-allowed border border-gp-border"
          : "bg-gp-green text-gp-white hover:opacity-90 cursor-pointer shadow-lg shadow-gp-green/10"
        }
      `}
    >
      {running
        ? "Running payroll…"
        : recipients.length === 0
        ? "Add recipients to run payroll"
        : `Run Payroll — ${(totalUsdc / 1_000_000).toFixed(2)} USDC`}
    </button>
  );
}
