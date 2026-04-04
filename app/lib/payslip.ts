import { Payslip, PaymentRecord } from "../types";

export function buildPayslip(p: PaymentRecord, employerWallet: string): Payslip {
  return {
    batchId:         p.batchId,
    recipientWallet: p.recipientWallet,
    employerWallet,
    amountUsdc:      p.amountUsdc,
    stablecoin:      p.stablecoin ?? "USDC",
    currency:        p.currency,
    localAmount:     p.localAmount,
    date:            p.date,
    txSig:           p.txSig,
    generatedAt:     Date.now(),
    network:         "devnet",
  };
}

export function downloadPayslip(payslip: Payslip): void {
  const content = JSON.stringify(payslip, null, 2);
  const blob    = new Blob([content], { type: "application/json" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href        = url;
  a.download    = `ghostpay-payslip-${payslip.batchId.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
