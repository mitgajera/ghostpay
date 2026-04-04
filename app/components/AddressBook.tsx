import { useState, useEffect } from "react";
import { AddressBookEntry, Recipient } from "../types";
import { Currency, CURRENCIES, CURRENCY_META } from "../constants";
import { getAll, addEntry, removeEntry } from "../lib/address-book";
import FlagImg from "./FlagImg";

interface Props {
  onAddToPayroll: (entry: AddressBookEntry) => void;
  onToast: (level: "ok" | "error" | "info", msg: string) => void;
}

const EMPTY = { wallet: "", name: "", currency: CURRENCIES[0] as Currency, label: "" };

export default function AddressBook({ onAddToPayroll, onToast }: Props) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [form,    setForm]    = useState(EMPTY);
  const [adding,  setAdding]  = useState(false);
  const [search,  setSearch]  = useState("");

  function refresh() { setEntries(getAll()); }
  useEffect(refresh, []);

  function handleAdd() {
    if (!form.name.trim()) return;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(form.wallet.trim())) {
      onToast("error", "Invalid Solana address"); return;
    }
    addEntry({ wallet: form.wallet.trim(), name: form.name.trim(), currency: form.currency, label: form.label.trim() || undefined, addedAt: Date.now() });
    setForm(EMPTY);
    setAdding(false);
    refresh();
    onToast("ok", `${form.name} saved to address book`);
  }

  function handleRemove(wallet: string, name: string) {
    removeEntry(wallet);
    refresh();
    onToast("info", `${name} removed from address book`);
  }

  const filtered = entries.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.wallet.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Search + add */}
      <div className="flex gap-2">
        <input
          className="gp-input flex-1"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setAdding(!adding)}
          className="font-mono text-xs text-gp-ghost-dim border border-gp-border-2 hover:border-gp-border-3 px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          + New contact
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-gp-surface-2 border border-gp-border-2 rounded-xl p-4 flex flex-col gap-3 animate-slide-up">
          <div className="grid grid-cols-[1fr_2fr_72px_auto] gap-2">
            <div>
              <label className="gp-label">Name</label>
              <input className="gp-input" placeholder="Alice" value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="gp-label">Wallet</label>
              <input className="gp-input" placeholder="Solana address" value={form.wallet}
                onChange={(e) => setForm(f => ({ ...f, wallet: e.target.value }))} />
            </div>
            <div>
              <label className="gp-label">Currency</label>
              <select className="gp-input" value={form.currency}
                onChange={(e) => setForm(f => ({ ...f, currency: e.target.value as Currency }))}>
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{CURRENCY_META[c]?.flag} {c} — {CURRENCY_META[c]?.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-[22px]">
              <button onClick={handleAdd}
                className="h-[34px] px-4 bg-gp-green text-gp-white font-display font-semibold text-xs rounded-lg hover:opacity-90">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts list */}
      {filtered.length === 0 ? (
        <p className="font-mono text-xs text-gp-border-3 text-center py-8">
          {entries.length === 0 ? "No contacts yet. Add your team members for quick payroll." : "No results."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((e) => (
            <div key={e.wallet} className="gp-card px-4 py-3 flex items-center justify-between hover:border-gp-border-2 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-gp-ghost">{e.name}</span>
                  {e.label && <span className="font-mono text-[9px] text-gp-border-3 uppercase tracking-widest border border-gp-border-2 rounded px-1.5 py-px">{e.label}</span>}
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gp-ghost-dim/50">
                    <FlagImg currency={e.currency} size={11} /> {e.currency}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-gp-border-3 mt-0.5">
                  {e.wallet.slice(0, 8)}…{e.wallet.slice(-6)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onAddToPayroll(e); onToast("info", `${e.name} added to payroll`); }}
                  className="font-mono text-[10px] text-gp-ghost-dim border border-gp-border-2 hover:border-gp-green/40 hover:text-gp-green px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Add to payroll
                </button>
                <button onClick={() => handleRemove(e.wallet, e.name)}
                  className="font-mono text-[10px] text-gp-border-3 hover:text-red-400/70 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
