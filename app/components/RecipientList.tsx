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
  const [form, setForm]   = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  function add() {
    setError(null);
    const amt = parseFloat(form.usdcDisplay);
    if (!form.name.trim())
      return setError("Name is required");
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(form.wallet.trim()))
      return setError("Invalid Solana address");
    if (isNaN(amt) || amt <= 0)
      return setError("Amount must be greater than 0");

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

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") add();
  }

  const total = recipients.reduce((s, r) => s + r.amountUsdc, 0);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Table ────────────────────────────────────────────────── */}
      {recipients.length > 0 ? (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs font-mono min-w-[520px]">
            <thead>
              <tr>
                {["Name", "Wallet", "Cur", "USDC", "Local equiv.", ""].map((h, i) => (
                  <th
                    key={h + i}
                    className={`pb-3 font-normal text-[9px] text-gp-ghost-dim/60 uppercase tracking-[0.14em] border-b border-gp-border ${
                      i >= 3 ? "text-right" : "text-left"
                    } ${i === 5 ? "w-8" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => {
                const rate = fxRates[r.currency];
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="border-b border-gp-border/50 transition-colors duration-100 hover:bg-gp-surface-2/60"
                  >
                    <td className="py-3 text-gp-ghost font-medium">{r.name}</td>
                    <td className="py-3 text-gp-ghost-dim">
                      {r.wallet.slice(0, 6)}…{r.wallet.slice(-4)}
                    </td>
                    <td className="py-3 text-gp-ghost-dim">{r.currency}</td>
                    <td className="py-3 text-right text-gp-ghost">
                      {(r.amountUsdc / 1_000_000).toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-gp-ghost-dim/70">
                      {rate ? usdcToLocal(r.amountUsdc, rate, r.currency) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        className={`text-gp-border-3 hover:text-red-400/70 transition-colors duration-100 ${
                          hovered === r.id ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-[9px] text-gp-ghost-dim/40 uppercase tracking-widest">
                  {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
                </td>
                <td className="pt-4 text-right font-display font-bold text-gp-ghost">
                  {(total / 1_000_000).toFixed(2)}
                </td>
                <td colSpan={2} className="pt-4 text-right text-[9px] text-gp-ghost-dim/40 uppercase tracking-widest pr-0">
                  USDC
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="font-mono text-xs text-gp-border-3 text-center py-8">
          No recipients yet — add one below.
        </p>
      )}

      {/* ── Add form ─────────────────────────────────────────────── */}
      <div className="border-t border-gp-border pt-5">
        <p className="gp-label mb-4">Add recipient</p>
        <div className="grid grid-cols-[1fr_2fr_72px_88px_auto] gap-2 items-start">
          <div>
            <label className="gp-label">Name</label>
            <input
              className="gp-input"
              placeholder="Alice"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={handleKey}
            />
          </div>
          <div>
            <label className="gp-label">Wallet address</label>
            <input
              className="gp-input"
              placeholder="Solana public key"
              value={form.wallet}
              onChange={(e) => setForm((f) => ({ ...f, wallet: e.target.value }))}
              onKeyDown={handleKey}
            />
          </div>
          <div>
            <label className="gp-label">Currency</label>
            <select
              className="gp-input"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="gp-label">USDC</label>
            <input
              className="gp-input"
              type="number"
              placeholder="100"
              min="0"
              step="0.01"
              value={form.usdcDisplay}
              onChange={(e) => setForm((f) => ({ ...f, usdcDisplay: e.target.value }))}
              onKeyDown={handleKey}
            />
          </div>
          <div className="mt-[22px]">
            <button
              onClick={add}
              className="h-[34px] px-4 bg-gp-surface-2 border border-gp-border-2 hover:border-gp-border-3 text-gp-ghost font-display font-semibold text-xs rounded-lg transition-all duration-150 hover:bg-gp-border whitespace-nowrap"
            >
              + Add
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 font-mono text-[11px] text-red-400/80">{error}</p>
        )}
      </div>
    </div>
  );
}
