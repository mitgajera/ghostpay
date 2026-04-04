import { useState, useRef, useEffect } from "react";
import { Recipient } from "../types";
import { Currency, CURRENCIES, STABLECOINS, STABLECOIN_SYMBOLS, StablecoinSymbol } from "../constants";
import { usdcToLocal } from "../lib/fx-rates";
import { getAll } from "../lib/address-book";
import { AddressBookEntry } from "../types";

interface Props {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
  fxRates: Partial<Record<Currency, number>>;
}

const EMPTY = {
  name: "",
  wallet: "",
  stablecoin: "USDC" as StablecoinSymbol,
  currency: CURRENCIES[0] as Currency,
  usdcDisplay: "",
};

function CoinBadge({ symbol, size = "sm" }: { symbol: StablecoinSymbol; size?: "xs" | "sm" }) {
  const coin = STABLECOINS[symbol];
  return (
    <span
      className={`font-mono font-semibold rounded px-1.5 py-px ${size === "xs" ? "text-[9px]" : "text-[10px]"}`}
      style={{ color: coin.color, background: coin.bgColor, border: `1px solid ${coin.color}30` }}
    >
      {symbol}
    </span>
  );
}

export default function RecipientList({ recipients, onChange, fxRates }: Props) {
  const [form, setForm]         = useState(EMPTY);
  const [error, setError]       = useState<string | null>(null);
  const [hovered, setHovered]   = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const bookRef = useRef<HTMLDivElement>(null);
  const usdcRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!bookOpen) return;
    function handle(e: MouseEvent) {
      if (bookRef.current && !bookRef.current.contains(e.target as Node)) {
        setBookOpen(false);
        setBookSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [bookOpen]);

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
      stablecoin: form.stablecoin,
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

  function pickContact(entry: AddressBookEntry) {
    setForm((f) => ({ ...f, name: entry.name, wallet: entry.wallet, currency: entry.currency }));
    setBookOpen(false);
    setBookSearch("");
    setTimeout(() => usdcRef.current?.focus(), 50);
  }

  const contacts = getAll();
  const filtered = contacts.filter(
    (e) =>
      e.name.toLowerCase().includes(bookSearch.toLowerCase()) ||
      e.wallet.toLowerCase().includes(bookSearch.toLowerCase())
  );

  const total = recipients.reduce((s, r) => s + r.amountUsdc, 0);
  const coin  = STABLECOINS[form.stablecoin];

  return (
    <div className="flex flex-col gap-6">

      {/* ── Table ────────────────────────────────────────────────── */}
      {recipients.length > 0 ? (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs font-mono min-w-[560px]">
            <thead>
              <tr>
                {["Name", "Wallet", "Asset", "Cur", "Amount", "Local equiv.", ""].map((h, i) => (
                  <th
                    key={h + i}
                    className={`pb-3 font-normal text-[9px] text-gp-ghost-dim/60 uppercase tracking-[0.14em] border-b border-gp-border ${
                      i >= 4 ? "text-right" : "text-left"
                    } ${i === 6 ? "w-8" : ""}`}
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
                    <td className="py-3">
                      <CoinBadge symbol={r.stablecoin ?? "USDC"} size="xs" />
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
                <td colSpan={4} className="pt-4 text-[9px] text-gp-ghost-dim/40 uppercase tracking-widest">
                  {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
                </td>
                <td className="pt-4 text-right font-display font-bold text-gp-ghost">
                  {(total / 1_000_000).toFixed(2)}
                </td>
                <td colSpan={2} className="pt-4 text-right text-[9px] text-gp-ghost-dim/40 uppercase tracking-widest pr-0">
                  mixed
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="font-mono text-xs text-gp-border-3 text-center py-8">
          No recipients yet — add one below or pick from address book.
        </p>
      )}

      {/* ── Add form ─────────────────────────────────────────────── */}
      <div className="border-t border-gp-border pt-5">
        <div className="flex items-center justify-between mb-4">
          <p className="gp-label">Add recipient</p>

          {/* Address book picker */}
          <div className="relative" ref={bookRef}>
            <button
              onClick={() => { setBookOpen((o) => !o); setBookSearch(""); }}
              className="font-mono text-[10px] text-gp-ghost-dim border border-gp-border-2 hover:border-gp-border-3 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span className="text-gp-ghost-dim/50">☰</span> From address book
              {contacts.length > 0 && (
                <span className="bg-gp-surface-2 text-gp-border-3 text-[9px] px-1.5 rounded-full">
                  {contacts.length}
                </span>
              )}
            </button>

            {bookOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-gp-surface border border-gp-border-2 rounded-xl shadow-xl z-30 overflow-hidden animate-slide-up">
                <div className="p-2 border-b border-gp-border">
                  <input
                    className="gp-input text-xs w-full"
                    placeholder="Search contacts…"
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="font-mono text-[10px] text-gp-border-3 text-center py-4">
                      {contacts.length === 0 ? "No contacts yet" : "No results"}
                    </p>
                  ) : (
                    filtered.map((e) => (
                      <button
                        key={e.wallet}
                        onClick={() => pickContact(e)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gp-surface-2 transition-colors text-left"
                      >
                        <div>
                          <p className="font-display font-semibold text-xs text-gp-ghost">{e.name}</p>
                          <p className="font-mono text-[9px] text-gp-border-3 mt-0.5">
                            {e.wallet.slice(0, 6)}…{e.wallet.slice(-4)}
                          </p>
                        </div>
                        <span className="font-mono text-[9px] text-gp-ghost-dim/50 border border-gp-border rounded px-1.5 py-px">
                          {e.currency}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stablecoin pill selector */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="font-mono text-[9px] text-gp-ghost-dim/40 uppercase tracking-widest mr-1">Pay in</span>
          {STABLECOIN_SYMBOLS.map((s) => {
            const c = STABLECOINS[s];
            const active = form.stablecoin === s;
            return (
              <button
                key={s}
                onClick={() => setForm((f) => ({ ...f, stablecoin: s }))}
                className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all duration-150"
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
            <label className="gp-label">Local cur.</label>
            <select
              className="gp-input"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="gp-label" style={{ color: coin.color }}>
              {form.stablecoin} amount
            </label>
            <input
              ref={usdcRef}
              className="gp-input"
              type="number"
              placeholder="100"
              min="0"
              step="0.01"
              value={form.usdcDisplay}
              onChange={(e) => setForm((f) => ({ ...f, usdcDisplay: e.target.value }))}
              onKeyDown={handleKey}
              style={{ borderColor: form.usdcDisplay ? `${coin.color}40` : undefined }}
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
