import { useState, useEffect } from "react";
import { Recipient } from "../types";
import { Currency, CURRENCIES } from "../constants";
import { getRate, usdcToLocal } from "../lib/fx-rates";

interface Props {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
}

const EMPTY_FORM = { name: "", wallet: "", currency: CURRENCIES[0] as Currency, usdcDisplay: "" };

export default function RecipientList({ recipients, onChange }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Prefetch rates for all supported currencies
  useEffect(() => {
    for (const c of CURRENCIES) {
      getRate(c)
        .then((r) => setRates((prev) => ({ ...prev, [c]: r.rate })))
        .catch(() => {});
    }
  }, []);

  function add() {
    setFormError(null);
    const usdcFloat = parseFloat(form.usdcDisplay);
    if (!form.name.trim()) return setFormError("Name is required");
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(form.wallet))
      return setFormError("Invalid Solana wallet address");
    if (isNaN(usdcFloat) || usdcFloat <= 0) return setFormError("Amount must be > 0");

    const recipient: Recipient = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      wallet: form.wallet.trim(),
      currency: form.currency,
      amountUsdc: Math.round(usdcFloat * 1_000_000),
    };
    onChange([...recipients, recipient]);
    setForm(EMPTY_FORM);
  }

  function remove(id: string) {
    onChange(recipients.filter((r) => r.id !== id));
  }

  const totalUsdc = recipients.reduce((s, r) => s + r.amountUsdc, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Add row */}
      <div className="grid grid-cols-[1fr_2fr_auto_auto_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Name</label>
          <input
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            placeholder="Alice"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Wallet</label>
          <input
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            placeholder="Solana public key"
            value={form.wallet}
            onChange={(e) => setForm((f) => ({ ...f, wallet: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Currency</label>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">USDC</label>
          <input
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white w-24 placeholder-gray-500 focus:outline-none focus:border-purple-500"
            placeholder="10.00"
            type="number"
            min="0"
            step="0.01"
            value={form.usdcDisplay}
            onChange={(e) => setForm((f) => ({ ...f, usdcDisplay: e.target.value }))}
          />
        </div>
        <button
          onClick={add}
          className="self-end bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
        >
          Add
        </button>
      </div>

      {formError && <p className="text-red-400 text-xs">{formError}</p>}

      {/* Table */}
      {recipients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Wallet</th>
                <th className="pb-2 font-medium">Currency</th>
                <th className="pb-2 font-medium text-right">USDC</th>
                <th className="pb-2 font-medium text-right">Local equiv.</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 text-white">{r.name}</td>
                  <td className="py-2 text-gray-400 font-mono text-xs">
                    {r.wallet.slice(0, 6)}…{r.wallet.slice(-4)}
                  </td>
                  <td className="py-2 text-gray-300">{r.currency}</td>
                  <td className="py-2 text-right text-white">
                    {(r.amountUsdc / 1_000_000).toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-cyan-400 text-xs">
                    {rates[r.currency]
                      ? usdcToLocal(r.amountUsdc, rates[r.currency], r.currency)
                      : "…"}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => remove(r.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-gray-400">
                <td colSpan={3} className="pt-3 text-xs">Total</td>
                <td className="pt-3 text-right text-white font-medium">
                  {(totalUsdc / 1_000_000).toFixed(2)} USDC
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {recipients.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-4">No recipients yet.</p>
      )}
    </div>
  );
}
