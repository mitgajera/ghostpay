interface Props {
  depositSig: string;
  senderAddress: string;
  recipientCount: number;
  totalUsdc: number; // lamports
}

const PRIVATE_PROG = "SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2";

/** A redacted "block" — the visual centrepiece of the Explorer panel. */
function Redacted({ wide = false }: { wide?: boolean }) {
  return (
    <span
      className={`inline-block align-middle rounded-[3px] bg-gp-ghost-dim/15 ${wide ? "w-14 h-[0.85em]" : "w-9 h-[0.85em]"}`}
      aria-hidden
    />
  );
}

export default function ExplorerPanel({ depositSig, senderAddress, recipientCount, totalUsdc }: Props) {
  const shortSig    = `${depositSig.slice(0, 8)}…${depositSig.slice(-6)}`;
  const shortFrom   = `${senderAddress.slice(0, 6)}…${senderAddress.slice(-4)}`;
  const shortTo     = `${PRIVATE_PROG.slice(0, 6)}…${PRIVATE_PROG.slice(-4)}`;
  const totalDisplay = (totalUsdc / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="rounded-2xl border border-gp-green/25 overflow-hidden animate-slide-up">

      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-gp-green/10 border-b border-gp-green/20">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-gp-green animate-pulse-dot" />
          <span className="font-display font-semibold text-xs text-gp-green uppercase tracking-[0.15em]">
            What the world sees
          </span>
        </div>
        <span className="font-mono text-[9px] text-gp-green/50 uppercase tracking-widest">
          Solana Explorer · devnet
        </span>
      </div>

      {/* ── Transaction rows ────────────────────────────────────────── */}
      <div
        className="px-5 py-5 space-y-3 font-mono text-xs"
        style={{ background: "linear-gradient(135deg, #0a120d 0%, #0a0a0a 100%)" }}
      >
        {/* Sig */}
        <div className="flex gap-4">
          <span className="text-gp-ghost-dim/40 uppercase tracking-widest text-[9px] w-20 shrink-0 pt-0.5">Tx</span>
          <span className="text-gp-ghost-dim">{shortSig}</span>
        </div>

        {/* From */}
        <div className="flex gap-4">
          <span className="text-gp-ghost-dim/40 uppercase tracking-widest text-[9px] w-20 shrink-0 pt-0.5">From</span>
          <span className="text-gp-ghost">{shortFrom}</span>
        </div>

        {/* To */}
        <div className="flex gap-4">
          <span className="text-gp-ghost-dim/40 uppercase tracking-widest text-[9px] w-20 shrink-0 pt-0.5">To</span>
          <span className="text-gp-ghost">
            {shortTo}
            <span className="text-gp-ghost-dim/50 ml-2">Private Payments Program</span>
          </span>
        </div>

        {/* Total (visible) */}
        <div className="flex gap-4">
          <span className="text-gp-ghost-dim/40 uppercase tracking-widest text-[9px] w-20 shrink-0 pt-0.5">Amount</span>
          <div className="flex items-center gap-2">
            <span className="text-gp-white font-semibold">{totalDisplay} USDC</span>
            <span className="text-gp-green/60 text-[9px] uppercase tracking-widest border border-gp-green/20 rounded px-1.5 py-0.5">
              visible
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gp-border-2/60 my-1" />

        {/* Recipients — redacted */}
        <div className="flex gap-4">
          <span className="text-gp-ghost-dim/40 uppercase tracking-widest text-[9px] w-20 shrink-0 pt-0.5">Recipients</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: recipientCount }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-gp-ghost-dim/30" />
              ))}
            </div>
            <span className="text-gp-ghost-dim/40 text-[9px] uppercase tracking-widest border border-gp-border-3/50 rounded px-1.5 py-0.5">
              {recipientCount} hidden
            </span>
          </div>
        </div>

        {/* Amounts — redacted */}
        <div className="flex gap-4">
          <span className="text-gp-ghost-dim/40 uppercase tracking-widest text-[9px] w-20 shrink-0 pt-0.5">Amounts</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: recipientCount }).map((_, i) => (
                <Redacted key={i} />
              ))}
            </div>
            <span className="text-gp-ghost-dim/40 text-[9px] uppercase tracking-widest border border-gp-border-3/50 rounded px-1.5 py-0.5">
              encrypted
            </span>
          </div>
        </div>
      </div>

      {/* ── Legend footer ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-5 py-3 bg-gp-surface border-t border-gp-green/15 font-mono text-[9px]">
        <span className="flex items-center gap-1.5 text-gp-green">
          <span>✓</span> Total deposit on-chain
        </span>
        <span className="flex items-center gap-1.5 text-gp-ghost-dim/50">
          <span>✗</span> Individual amounts hidden
        </span>
        <span className="flex items-center gap-1.5 text-gp-ghost-dim/50">
          <span>✗</span> Recipient wallets hidden
        </span>
        <span className="flex items-center gap-1.5 text-gp-ghost-dim/50">
          <span>✗</span> Per-person USDC hidden
        </span>
      </div>
    </div>
  );
}
