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
  const [amountDisplay, setAmountDisplay] = useState("");
  const [running, setRunning] = useState(false);

  async function withdraw() {
    if (!publicKey || !signTransaction || !authToken) return;
    const usdcFloat = parseFloat(amountDisplay);
    if (isNaN(usdcFloat) || usdcFloat <= 0) return;

    const lamports = Math.round(usdcFloat * 1_000_000);
    setRunning(true);

    const teeConn = new Connection(teeUrl(authToken), "confirmed");

    try {
      onLog({ ts: Date.now(), level: "info", msg: `Withdrawing ${usdcFloat.toFixed(2)} USDC…` });
      const payload = await buildWithdraw(publicKey.toBase58(), lamports, authToken);
      const sig = await signAndSend(
        payload,
        connection,
        teeConn,
        (tx: Transaction) => signTransaction(tx)
      );
      onLog({ ts: Date.now(), level: "ok", msg: `Withdraw confirmed — ${sig.slice(0, 12)}…` });
      setAmountDisplay("");
      onDone();
    } catch (e: any) {
      onLog({ ts: Date.now(), level: "error", msg: `Withdraw failed — ${e.message}` });
    } finally {
      setRunning(false);
    }
  }

  const maxUsdc = privateBalance != null ? privateBalance / 1_000_000 : 0;
  const disabled = !publicKey || !authToken || running || !amountDisplay || parseFloat(amountDisplay) <= 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-white font-semibold">Withdraw to Wallet</h2>

      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs text-gray-400">Amount (USDC)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            max={maxUsdc}
            placeholder="0.00"
            value={amountDisplay}
            onChange={(e) => setAmountDisplay(e.target.value)}
            disabled={running || !authToken}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 disabled:opacity-40"
          />
        </div>
        {maxUsdc > 0 && (
          <button
            onClick={() => setAmountDisplay(maxUsdc.toFixed(6))}
            disabled={running || !authToken}
            className="text-xs text-gray-500 hover:text-gray-300 pb-2 disabled:opacity-30"
          >
            Max
          </button>
        )}
      </div>

      <button
        onClick={withdraw}
        disabled={disabled}
        className={`
          py-3 rounded-lg font-semibold text-sm tracking-wide transition-all
          ${disabled
            ? "bg-gray-800 text-gray-600 cursor-not-allowed"
            : "bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 text-white shadow-lg shadow-cyan-900/30 cursor-pointer"
          }
        `}
      >
        {running ? "Withdrawing…" : "Withdraw to Devnet Wallet"}
      </button>

      {!authToken && (
        <p className="text-yellow-600 text-xs text-center">Authorize TEE to withdraw</p>
      )}
    </div>
  );
}
