import { Currency } from "./constants";

export interface Recipient {
  id: string;
  name: string;
  wallet: string;
  currency: Currency;
  amountUsdc: number; // lamports (6 decimals)
}

export interface PayrollBatch {
  id: string;
  recipients: Recipient[];
  totalUsdc: number;
  status: "idle" | "depositing" | "transferring" | "done" | "error";
  txSignatures: string[];
  createdAt: number;
}

export interface FxDisplay {
  currency: Currency;
  rate: number;
  localAmount: string;
}
