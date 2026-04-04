import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { buildWithdraw, signAndSend } from "../lib/per-api";
import { teeUrl } from "../lib/auth";
import { STABLECOINS, STABLECOIN_SYMBOLS, StablecoinSymbol } from "../constants";
import { usePrivateBalance } from "../hooks/usePrivateBalance";

export interface WithdrawLog {
  ts: number;
  level: "info" | "ok" | "error";
  msg: string;
}

interface Props {
  authToken: string | null;
  privateBalance: number | null; // kept for compat — we now fetch per-coin internally
  onLog: (entry: WithdrawLog) => void;
  onDone: () => void;
}

export default function WithdrawButton({ authToken, onLog, onDone }: Props) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [coin, setCoin]     = useState<StablecoinSymbol>("USDC");
  const [amount, setAmount] = useState("");
  const [running, setRunning] = useState(false);

  const mint = STABLECOINS[coin].mint;
  const { balance, refresh } = usePrivateBalance(authToken, mint);
  const maxAmt = balance != null ? balance / 1_000_000 : 0;

  async function withdraw() {
    if (!publicKey || !signTransaction || !authToken) return;
    const amtFloat = parseFloat(amount);
    if (isNaN(amtFloat) || amtFloat <= 0) return;

    setRunning(true);
    const teeConn = new Connection(teeUrl(authToken), "confirmed");

    try {
      onLog({ ts: Date.now(), level: "info", msg: `Withdrawing ${amtFloat.toFixed(6)} ${coin} → devnet wallet…` });
      const payload = await buildWithdraw(publicKey.toBase58(), Math.round(amtFloat * 1_000_000), authToken, mint);
      const sig = await signAndSend(payload, connection, teeConn, (tx: Transaction) => signTransaction(tx));
      onLog({ ts: Date.now(), level: "ok", msg: `Confirmed · ${sig.slice(0, 14)}…` });
      setAmount("");
      refresh();
      onDone();
    } catch (e: any) {
      onLog({ ts: Date.now(), level: "error", msg: `Failed — ${e.message}` });
    } finally {
      setRunning(false);
    }
  }

  const disabled = !publicKey || !authToken || running || !amount || parseFloat(amount) <= 0;
  const coinMeta = STABLECOINS[coin];

  return (
    <div className="gp-card p-6 flex flex-col gap-5">
      <span className="gp-label">Withdraw to wallet</span>

      {/* Stablecoin pill selector */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[9px] text-gp-ghost-dim/40 uppercase tracking-widest mr-1">Coin</span>
        {STABLECOIN_SYMBOLS.map((s) => {
          const c = STABLECOINS[s];
          const active = coin === s;
          return (
            <button
              key={s}
              onClick={() => { setCoin(s); setAmount(""); }}
              disabled={running || !authToken}
              className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all duration-150 disabled:opacity-30"
              style={
                active
                  ? { color: c.color, background: c.bgColor, border: `1px solid ${c.color}50` }
                  : { color: "#6b6966", background: "transparent", border: "1px solid #2a2a2a" }
              }
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Balance hint */}
      {authToken && balance !== null && (
        <p className="font-mono text-[10px] text-gp-ghost-dim/50 -mt-2">
          Private balance: <span style={{ color: coinMeta.color }}>{(balance / 1_000_000).toFixed(6)} {coin}</span>
        </p>
      )}

      {/* Amount row */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="gp-label" style={{ color: coinMeta.color }}>{coin} amount</label>
          <input
            type="number"
            min="0"
            step="0.000001"
            max={maxAmt}
            placeholder="0.000000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={running || !authToken}
            className="gp-input text-sm disabled:opacity-40"
            style={{ borderColor: amount ? `${coinMeta.color}40` : undefined }}
          />
        </div>
        {maxAmt > 0 && (
          <button
            onClick={() => setAmount(maxAmt.toFixed(6))}
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
        {running ? "Withdrawing…" : `Withdraw ${coin} to Wallet`}
      </button>

      {!authToken && (
        <p className="font-mono text-[10px] text-gp-border-3 text-center tracking-wide">
          Authorize TEE to withdraw
        </p>
      )}
    </div>
  );
}
