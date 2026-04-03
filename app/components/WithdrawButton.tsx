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
  const [amount, setAmount] = useState("");
  const [running, setRunning] = useState(false);

  const maxUsdc = privateBalance != null ? privateBalance / 1_000_000 : 0;

  async function withdraw() {
    if (!publicKey || !signTransaction || !authToken) return;
    const usdcFloat = parseFloat(amount);
    if (isNaN(usdcFloat) || usdcFloat <= 0) return;

    setRunning(true);
    const teeConn = new Connection(teeUrl(authToken), "confirmed");

    try {
      onLog({ ts: Date.now(), level: "info", msg: `Withdrawing ${usdcFloat.toFixed(2)} USDC…` });
      const payload = await buildWithdraw(publicKey.toBase58(), Math.round(usdcFloat * 1_000_000), authToken);
      const sig = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
      onLog({ ts: Date.now(), level: "ok", msg: `Withdraw confirmed — ${sig.slice(0, 12)}…` });
      setAmount("");
      onDone();
    } catch (e: any) {
      onLog({ ts: Date.now(), level: "error", msg: `Withdraw failed — ${e.message}` });
    } finally {
      setRunning(false);
    }
  }

  const disabled = !publicKey || !authToken || running || !amount || parseFloat(amount) <= 0;

  return (
    <div className="bg-gp-surface border border-gp-border rounded-xl p-6 flex flex-col gap-4">
      <span className="font-mono text-[10px] text-gp-ghost-dim uppercase tracking-widest">
        Withdraw to wallet
      </span>

      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1">
          <label className="font-mono text-[10px] text-gp-ghost-dim uppercase tracking-widest">
            Amount (USDC)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            max={maxUsdc}
            placeholder="0.000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={running || !authToken}
            className="bg-gp-surface-2 border border-gp-border hover:border-gp-border-2 focus:border-gp-ghost-dim rounded-md px-3 py-2 font-mono text-sm text-gp-white placeholder-gp-border-2 outline-none transition-colors disabled:opacity-40"
          />
        </div>
        {maxUsdc > 0 && (
          <button
            onClick={() => setAmount(maxUsdc.toFixed(6))}
            disabled={running || !authToken}
            className="font-mono text-[10px] text-gp-ghost-dim hover:text-gp-white pb-2.5 disabled:opacity-30 transition-colors uppercase tracking-widest"
          >
            Max
          </button>
        )}
      </div>

      <button
        onClick={withdraw}
        disabled={disabled}
        className={`
          w-full py-3.5 rounded-lg font-display font-semibold text-sm tracking-wide transition-all
          ${disabled
            ? "bg-gp-surface-2 text-gp-border-2 cursor-not-allowed border border-gp-border"
            : "bg-gp-green text-gp-white hover:opacity-90 cursor-pointer shadow-lg shadow-gp-green/10"
          }
        `}
      >
        {running ? "Withdrawing…" : "Withdraw to Devnet Wallet"}
      </button>

      {!authToken && (
        <p className="font-mono text-[10px] text-gp-border-2 text-center">Authorize TEE to withdraw</p>
      )}
    </div>
  );
}
