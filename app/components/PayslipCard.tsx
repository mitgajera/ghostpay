import { PaymentRecord } from "../types";
import { STABLECOINS } from "../constants";
import { buildPayslip, downloadPayslip } from "../lib/payslip";
import { EXPLORER_BASE } from "../constants";
import CoinImg from "./CoinImg";
import FlagImg from "./FlagImg";

interface Props {
  payment: PaymentRecord;
}

export default function PayslipCard({ payment }: Props) {
  function handleDownload() {
    const slip = buildPayslip(payment, payment.employerWallet);
    downloadPayslip(slip);
  }

  const coin = payment.stablecoin ?? "USDC";
  const meta = STABLECOINS[coin as keyof typeof STABLECOINS];

  return (
    <div className="gp-card px-5 py-4 flex items-center justify-between hover:border-gp-border-2 transition-colors">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="font-display font-semibold text-sm text-gp-white">
            {(payment.amountUsdc / 1_000_000).toFixed(6)}
          </span>
          <span
            className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold px-1.5 py-px rounded"
            style={{ color: meta?.color ?? "#888", background: meta?.bgColor ?? "#ffffff10", border: `1px solid ${meta?.color ?? "#888"}30` }}
          >
            <CoinImg symbol={coin} size={11} />
            {coin}
          </span>
          <span className="font-mono text-[10px] text-gp-green border border-gp-green/25 rounded px-1.5 py-px">
            received
          </span>
        </div>
        <p className="font-mono text-[10px] text-gp-ghost-dim/50 mt-1">
          {fmtDateTime(payment.date)}
          {payment.localAmount && (
            <span className="inline-flex items-center gap-1 ml-2">
              · <FlagImg currency={payment.currency} size={11} /> {payment.localAmount}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`${EXPLORER_BASE}/${payment.txSig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-gp-ghost-dim/50 hover:text-gp-ghost-dim border border-gp-border-2 rounded px-2 py-1 transition-colors"
        >
          {payment.txSig.slice(0, 8)}… ↗
        </a>
        <button
          onClick={handleDownload}
          className="font-mono text-[10px] text-gp-ghost-dim border border-gp-border-2 hover:border-gp-border-3 hover:text-gp-ghost px-3 py-1.5 rounded-lg transition-colors"
        >
          ↓ Payslip
        </button>
      </div>
    </div>
  );
}

function fmtDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
