import { Currency, Cadence } from "./constants";

export interface Recipient {
  id: string;
  name: string;
  wallet: string;
  currency: Currency;
  amountUsdc: number; // lamports (6 decimals)
  label?: string;
}

export interface FxDisplay {
  currency: Currency;
  rate: number;
  localAmount: string;
}

// - Templates
export interface PayrollTemplate {
  id: string;
  name: string;
  recipients: Recipient[];
  createdAt: number;
  lastUsedAt?: number;
}

// - Schedule
export interface PayrollSchedule {
  id: string;
  templateId: string;
  templateName: string;
  cadence: Cadence;
  nextRunAt: number;
  enabled: boolean;
  createdAt: number;
}

// - Address book
export interface AddressBookEntry {
  wallet: string;
  name: string;
  currency: Currency;
  label?: string;
  addedAt: number;
}

// - History
export interface BatchRecord {
  id: string;
  employerWallet: string;
  date: number;
  totalUsdc: number;
  recipientCount: number;
  depositSig: string;
  settled: boolean;
  recipients: { name: string; wallet: string; amountUsdc: number; currency: Currency }[];
}

// - Payment records (employee side)
export interface PaymentRecord {
  batchId: string;
  employerWallet: string;
  recipientWallet: string;
  amountUsdc: number;
  currency: Currency;
  localAmount: string;
  date: number;
  txSig: string;
}

// - Payslip
export interface Payslip {
  batchId: string;
  recipientWallet: string;
  employerWallet: string;
  amountUsdc: number;
  currency: Currency;
  localAmount: string;
  date: number;
  txSig: string;
  generatedAt: number;
  network: "devnet";
}
