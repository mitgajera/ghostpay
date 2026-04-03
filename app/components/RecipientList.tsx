import { useState } from "react";
import { Recipient } from "../types";
import { Currency, CURRENCIES } from "../constants";
import { usdcToLocal } from "../lib/fx-rates";

interface Props {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
  fxRates: Partial<Record<Currency, number>>;
}

const EMPTY = { name: "", wallet: "", currency: CURRENCIES[0] as Currency, usdcDisplay: "" };

export default function RecipientList({ recipients, onChange, fxRates }: Props) {
  const [form, setForm]       = useState(EMPTY);
  const [error, setError]     = useState<string | null>(null);

  function add() {
    setError(null);
    const amt = parseFloat(form.usdcDisplay);
    if (!form.name.trim())                           return setError("Name required");
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(form.wallet.trim()))
                                                     return setError("Invalid Solana address");
    if (isNaN(amt) || amt <= 0)                      return setError("Amount must be > 0");

    onChange([...recipients, {
      id:         crypto.randomUUID(),
      name:       form.name.trim(),
      wallet:     form.wallet.trim(),
      currency:   form.currency,
      amountUsdc: Math.round(amt * 1_000_000),
    }]);
    setForm(EMPTY);
  }

  function remove(id: string) {
    onChange(recipients.filter((r) => r.id !== id));
  }

  const label = "font-mono text-[10px] text-gp-ghost-dim uppercase tracking-widest mb-1 block";
  const input = "w-full bg-gp-surface-2 border border-gp-border hover:border-gp-border-2 focus:border-gp-ghost-dim rounded-md px-3 py-2 font-mono text-xs text-gp-white placeholder-gp-border-2 outline-none transition-colors";

  return (
    <div className="flex flex-col gap-5">
      {/* ── Add form ── */}
      <div className="grid grid-cols-[1fr_2fr_80px_90px_auto] gap-2 items-end">
        <div>
          <label className={label}>Name</label>
          <input className={input} placeholder="Alice" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className={label}>Wallet</label>
          <input className={input} placeholder="Solana address" value={form.wallet}
            onChange={(e) => setForm((f) => ({ ...f, wallet: e.target.value }))} />
        </div>
        <div>
          <label className={label}>Currency</label>
          <select className={input} value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>USDC</label>
          <input className={input} type="number" placeholder="100" min="0" step="0.01"
            value={form.usdcDisplay}
            onChange={(e) => setForm((f) => ({ ...f, usdcDisplay: e.target.value }))} />
        </div>
        <button
          onClick={add}
          className="self-end font-display font-semibold text-xs bg-gp-green text-gp-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
        >
          Add
        </button>
      </div>

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}

      {/* ── Table ── */}
      {recipients.length > 0 && (
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-gp-border">
              {["Name", "Wallet", "Currency", "USDC", "Local equiv.", ""].map((h) => (
                <th key={h} className={`pb-2 font-normal text-gp-ghost-dim uppercase tracking-widest text-[10px] ${h === "USDC" || h === "Local equiv." ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => {
              const rate = fxRates[r.currency];
              return (
                <tr key={r.id} className="border-b border-gp-border/50 hover:bg-gp-surface-2/40 transition-colors">
                  <td className="py-2.5 text-gp-white">{r.name}</td>
                  <td className="py-2.5 text-gp-ghost-dim">{r.wallet.slice(0, 6)}…{r.wallet.slice(-4)}</td>
                  <td className="py-2.5 text-gp-ghost-dim">{r.currency}</td>
                  <td className="py-2.5 text-right text-gp-white">{(r.amountUsdc / 1_000_000).toFixed(2)}</td>
                  <td className="py-2.5 text-right text-gp-ghost">
                    {rate ? usdcToLocal(r.amountUsdc, rate, r.currency) : "—"}
                  </td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => remove(r.id)}
                      className="text-gp-border-2 hover:text-red-400 transition-colors">
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-[10px] text-gp-ghost-dim uppercase tracking-widest">Total</td>
              <td className="pt-3 text-right font-display font-semibold text-gp-white">
                {(recipients.reduce((s, r) => s + r.amountUsdc, 0) / 1_000_000).toFixed(2)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      )}

      {recipients.length === 0 && (
        <p className="font-mono text-xs text-gp-border-2 text-center py-6">No recipients yet.</p>
      )}
    </div>
  );
}
