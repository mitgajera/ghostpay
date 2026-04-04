import { BatchRecord, PaymentRecord } from "../types";
import { LS_HISTORY, LS_PAYMENTS } from "../constants";

// - Employer batch history
function loadHistory(): BatchRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) ?? "[]"); }
  catch { return []; }
}
export const getBatches   = (): BatchRecord[] => loadHistory().sort((a, b) => b.date - a.date);
export const saveBatch    = (b: BatchRecord)  =>
  localStorage.setItem(LS_HISTORY, JSON.stringify([...loadHistory().filter(x => x.id !== b.id), b]));
export const markSettled  = (id: string)      =>
  localStorage.setItem(LS_HISTORY, JSON.stringify(loadHistory().map(b => b.id === id ? { ...b, settled: true } : b)));

// - Employee payment records
function payKey(wallet: string) { return `${LS_PAYMENTS}${wallet}`; }
function loadPayments(wallet: string): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(payKey(wallet)) ?? "[]"); }
  catch { return []; }
}
export const getPayments  = (wallet: string): PaymentRecord[] =>
  loadPayments(wallet).sort((a, b) => b.date - a.date);
export const savePayment  = (p: PaymentRecord) => {
  const all = loadPayments(p.recipientWallet).filter(x => x.txSig !== p.txSig);
  localStorage.setItem(payKey(p.recipientWallet), JSON.stringify([...all, p]));
};
