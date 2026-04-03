import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { Recipient } from "../types";
import { TEE_RPC_URL } from "../constants";
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
  onDone: () => void;
}

export default function PayrollButton({ recipients, authToken, onLog, onDone }: Props) {
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
    const sender = publicKey.toBase58();
    const totalUsdc = recipients.reduce((s, r) => s + r.amountUsdc, 0);

    log("info", `Starting payroll — ${recipients.length} recipient(s), ${(totalUsdc / 1_000_000).toFixed(2)} USDC total`);

    try {
      // Step 1 — Deposit total USDC into PER (employer's vault)
      log("info", `Depositing ${(totalUsdc / 1_000_000).toFixed(2)} USDC → Private Ephemeral Rollup…`);
      const depositPayload = await buildDeposit(sender, totalUsdc);
      const depositSig = await signAndSend(depositPayload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
      await connection.confirmTransaction(depositSig, "confirmed");
      log("ok", `Deposit confirmed — ${depositSig.slice(0, 12)}… | Only total visible on-chain`);
    } catch (e: any) {
      log("error", `Deposit failed — ${e.message}`);
      setRunning(false);
      return;
    }

    // Step 2 — Private transfer to each recipient inside PER
    let failed = 0;
    for (const r of recipients) {
      try {
        log("info", `Sending privately to ${r.name} (${r.wallet.slice(0, 6)}…) — ${(r.amountUsdc / 1_000_000).toFixed(2)} USDC`);
        const payload = await buildPrivateTransfer(sender, r.wallet, r.amountUsdc, authToken);
        const sig = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
        log("ok", `Sent privately to ${r.name} ✓ (${sig.slice(0, 12)}…)`);
      } catch (e: any) {
        log("error", `✗ ${r.name} — ${e.message}`);
        failed++;
      }
    }

    if (failed === 0) {
      log("ok", "Payroll complete. Zero individual traces on Solana. Recipients can withdraw from their employee page.");
    } else {
      log("error", `Payroll finished with ${failed} failure(s). Other recipients were paid successfully.`);
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
        w-full py-3 rounded-lg font-semibold text-sm tracking-wide transition-all
        ${disabled
          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
          : "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg shadow-purple-900/30 cursor-pointer"
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
