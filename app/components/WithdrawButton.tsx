import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { buildWithdraw, signAndSend } from "../lib/per-api";
import { teeUrl } from "../lib/auth";

export interface WithdrawLog {
  ts: number;
  level: "info" | "ok" | "error";
  msg: string;
}

interface Props {
  authToken: string | null;
  privateBalance: number | null;
  onLog: (entry: WithdrawLog) => void;
  onDone: () => void;
}

export default function WithdrawButton({ authToken, privateBalance, onLog, onDone }: Props) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount]   = useState("");
  const [running, setRunning] = useState(false);

  const maxUsdc = privateBalance != null ? privateBalance / 1_000_000 : 0;

  async function withdraw() {
    if (!publicKey || !signTransaction || !authToken) return;
    const usdcFloat = parseFloat(amount);
    if (isNaN(usdcFloat) || usdcFloat <= 0) return;

    setRunning(true);
    const teeConn = new Connection(teeUrl(authToken), "confirmed");

    try {
      onLog({ ts: Date.now(), level: "info", msg: `Withdrawing ${usdcFloat.toFixed(6)} USDC → devnet wallet…` });
      const payload = await buildWithdraw(publicKey.toBase58(), Math.round(usdcFloat * 1_000_000), authToken);
      const sig = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
      onLog({ ts: Date.now(), level: "ok", msg: `Confirmed · ${sig.slice(0, 14)}…` });
      setAmount("");
      onDone();
    } catch (e: any) {
      onLog({ ts: Date.now(), level: "error", msg: `Failed — ${e.message}` });
    } finally {
      setRunning(false);
    }
  }

  const disabled = !publicKey || !authToken || running || !amount || parseFloat(amount) <= 0;

  return (
    <div className="gp-card p-6 flex flex-col gap-5">
      <span className="gp-label">Withdraw to wallet</span>

      {/* Amount row */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="gp-label">Amount (USDC)</label>
          <input
            type="number"
            min="0"
            step="0.000001"
            max={maxUsdc}
            placeholder="0.000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={running || !authToken}
            className="gp-input text-sm disabled:opacity-40"
          />
        </div>
        {maxUsdc > 0 && (
          <button
            onClick={() => setAmount(maxUsdc.toFixed(6))}
            disabled={running || !authToken}
            className="mb-px font-mono text-[9px] text-gp-ghost-dim/50 hover:text-gp-ghost-dim uppercase tracking-widest transition-colors disabled:opacity-30 pb-2.5"
          >
            Max
          </button>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={withdraw}
        disabled={disabled}
        className={`
          relative w-full py-3.5 rounded-xl font-display font-bold text-sm tracking-wide
          transition-all duration-200
          ${disabled
            ? "bg-gp-surface-2 text-gp-border-3 border border-gp-border cursor-not-allowed"
            : "bg-gp-green text-gp-white hover:bg-gp-green-2 cursor-pointer shadow-[0_0_24px_rgba(26,122,74,0.2)]"
          }
        `}
      >
        {running ? "Withdrawing…" : "Withdraw to Devnet Wallet"}
      </button>

      {!authToken && (
        <p className="font-mono text-[10px] text-gp-border-3 text-center tracking-wide">
          Authorize TEE to withdraw
        </p>
      )}
    </div>
  );
}
