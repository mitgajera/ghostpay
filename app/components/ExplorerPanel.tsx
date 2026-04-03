/**
 * ExplorerPanel — "What the world sees"
 *
 * Shows what a Solana block explorer reveals about a payroll batch:
 * only the total deposit to the Private Payments Program is visible.
 * Individual recipients and amounts are redacted — this is the hero moment.
 */

interface Props {
  depositSig: string;
  senderAddress: string;
  recipientCount: number;
  totalUsdc: number; // lamports
}

const PRIVATE_PAYMENTS_PROG = "SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2";

export default function ExplorerPanel({ depositSig, senderAddress, recipientCount, totalUsdc }: Props) {
  const shortSig    = `${depositSig.slice(0, 8)}…${depositSig.slice(-6)}`;
  const shortSender = `${senderAddress.slice(0, 6)}…${senderAddress.slice(-4)}`;
  const shortProg   = `${PRIVATE_PAYMENTS_PROG.slice(0, 6)}…${PRIVATE_PAYMENTS_PROG.slice(-4)}`;

  return (
    <div className="rounded-xl border border-gp-green/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-gp-green/10 border-b border-gp-green/20 flex items-center justify-between">
        <span className="font-display text-xs font-semibold text-gp-green uppercase tracking-widest">
          What the world sees
        </span>
        <span className="font-mono text-[10px] text-gp-ghost-dim">Solana devnet explorer</span>
      </div>

      {/* Explorer rows */}
      <div className="px-4 py-4 bg-[#0d150f] space-y-2.5 font-mono text-xs">
        <Row label="TX" value={shortSig} dim />
        <Row label="FROM" value={shortSender} />
        <Row label="TO">
          <span className="text-gp-white">{shortProg}</span>
          <span className="text-gp-ghost-dim ml-2">(Private Payments Program)</span>
        </Row>
        <Row label="AMOUNT">
          <span className="text-gp-white">{(totalUsdc / 1_000_000).toFixed(2)} USDC</span>
          <span className="text-gp-ghost-dim ml-2">← only this is visible</span>
        </Row>

        <div className="border-t border-gp-green/10 pt-2.5 space-y-2.5">
          <Row label="RECIPIENTS">
            <span className="tracking-[0.4em] text-gp-ghost-dim/60 select-none">
              {"● ".repeat(recipientCount).trim()}
            </span>
            <span className="text-gp-ghost-dim ml-2">({recipientCount} wallets hidden)</span>
          </Row>
          <Row label="AMOUNTS">
            <span className="tracking-[0.15em] text-gp-ghost-dim/50 select-none font-bold">
              {"████  ".repeat(recipientCount).trim()}
            </span>
            <span className="text-gp-ghost-dim ml-2">(encrypted in TEE)</span>
          </Row>
        </div>
      </div>

      {/* Footer legend */}
      <div className="px-4 py-3 bg-gp-green/5 border-t border-gp-green/20 grid grid-cols-2 gap-2 font-mono text-[10px]">
        <span className="text-gp-green flex items-center gap-1.5">
          <span className="text-gp-green">✓</span> Total deposit visible
        </span>
        <span className="text-gp-ghost-dim flex items-center gap-1.5">
          <span>✗</span> Individual amounts hidden
        </span>
        <span className="text-gp-ghost-dim flex items-center gap-1.5">
          <span>✗</span> Recipient wallets hidden
        </span>
        <span className="text-gp-ghost-dim flex items-center gap-1.5">
          <span>✗</span> Per-person USDC hidden
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  dim,
  children,
}: {
  label: string;
  value?: string;
  dim?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-baseline">
      <span className="text-gp-ghost-dim/60 w-20 shrink-0 uppercase tracking-widest text-[10px]">{label}</span>
      {children ?? (
        <span className={dim ? "text-gp-ghost-dim" : "text-gp-white"}>{value}</span>
      )}
    </div>
  );
}
