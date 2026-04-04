import { useState, useEffect } from "react";
import { BatchRecord } from "../types";
import { Recipient } from "../types";
import { STABLECOINS } from "../constants";
import { getBatches } from "../lib/history";
import { EXPLORER_BASE } from "../constants";
import CoinImg from "./CoinImg";
import FlagImg from "./FlagImg";

interface Props {
  onClone: (recipients: Recipient[]) => void;
  onToast: (level: "ok" | "error" | "info", msg: string) => void;
}

export default function BatchHistory({ onClone, onToast }: Props) {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { setBatches(getBatches()); }, []);

  function handleClone(b: BatchRecord) {
    const recipients: Recipient[] = b.recipients.map((r) => ({
      ...r,
      id:         crypto.randomUUID(),
      stablecoin: r.stablecoin ?? "USDC", // default for records saved before multi-coin
    }));
    onClone(recipients);
    onToast("info", `Cloned ${b.recipients.length} recipients from ${fmtDate(b.date)}`);
  }

  if (batches.length === 0) {
    return (
      <p className="font-mono text-xs text-gp-border-3 text-center py-10">
        No payroll history yet. Run your first payroll to see it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {batches.map((b) => (
        <div key={b.id} className="gp-card overflow-hidden hover:border-gp-border-2 transition-colors">
          {/* Summary row */}
          <button
            className="w-full px-5 py-4 flex items-center justify-between text-left"
            onClick={() => setExpanded(expanded === b.id ? null : b.id)}
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-display font-semibold text-sm text-gp-ghost">
                  {(b.totalUsdc / 1_000_000).toFixed(2)}
                </span>
                {/* Show which coins were used */}
                <div className="flex gap-1">
                  {[...new Set(b.recipients.map((r) => r.stablecoin ?? "USDC"))].map((coin) => {
                    const c = STABLECOINS[coin as keyof typeof STABLECOINS];
                    return (
                      <span
                        key={coin}
                        className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold px-1.5 py-px rounded"
                        style={{ color: c?.color ?? "#888", background: c?.bgColor ?? "#ffffff10", border: `1px solid ${c?.color ?? "#888"}30` }}
                      >
                        <CoinImg symbol={coin} size={10} />
                        {coin}
                      </span>
                    );
                  })}
                </div>
                <span className={`font-mono text-[9px] uppercase tracking-widest border rounded px-1.5 py-px ${
                  b.settled
                    ? "border-gp-green/30 text-gp-green"
                    : "border-gp-border-2 text-gp-border-3"
                }`}>
                  {b.settled ? "settled" : "pending"}
                </span>
              </div>
              <p className="font-mono text-[10px] text-gp-ghost-dim/50 mt-1">
                {fmtDate(b.date)} · {fmtTime(b.date)} · {b.recipientCount} recipient{b.recipientCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`${EXPLORER_BASE}/${b.depositSig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-[10px] text-gp-ghost-dim/50 hover:text-gp-ghost-dim transition-colors border border-gp-border-2 rounded px-2 py-1"
              >
                {b.depositSig.slice(0, 8)}… ↗
              </a>
              <span className="text-gp-border-3 text-xs">{expanded === b.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {/* Expanded recipients */}
          {expanded === b.id && (
            <div className="border-t border-gp-border px-5 py-4 animate-fade-in">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-gp-border">
                    {["Name", "Wallet", "Asset", "Currency", "Amount"].map((h, i) => (
                      <th key={h} className={`pb-2 font-normal text-[9px] text-gp-ghost-dim/50 uppercase tracking-widest ${i >= 4 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.recipients.map((r, i) => {
                    const coin = r.stablecoin ?? "USDC";
                    const c = STABLECOINS[coin as keyof typeof STABLECOINS];
                    return (
                      <tr key={i} className="border-b border-gp-border/40">
                        <td className="py-2 text-gp-ghost">{r.name}</td>
                        <td className="py-2 text-gp-ghost-dim">{r.wallet.slice(0, 6)}…{r.wallet.slice(-4)}</td>
                        <td className="py-2">
                          <span
                            className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold px-1.5 py-px rounded"
                            style={{ color: c?.color ?? "#888", background: c?.bgColor ?? "#ffffff10", border: `1px solid ${c?.color ?? "#888"}30` }}
                          >
                            <CoinImg symbol={coin} size={10} />
                            {coin}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="inline-flex items-center gap-1.5 text-gp-ghost-dim">
                            <FlagImg currency={r.currency} size={11} />
                            {r.currency}
                          </span>
                        </td>
                        <td className="py-2 text-right text-gp-ghost">{(r.amountUsdc / 1_000_000).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleClone(b)}
                  className="font-mono text-xs text-gp-ghost-dim border border-gp-border-2 hover:border-gp-border-3 px-4 py-1.5 rounded-lg transition-colors"
                >
                  Clone to new payroll
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
