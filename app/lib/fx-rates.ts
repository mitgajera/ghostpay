import { Currency } from "../constants";

export interface FxRate {
  from: string;
  to: Currency;
  rate: number;
  fetchedAt: number;
}

export async function getRate(currency: Currency): Promise<FxRate> {
  const res = await fetch(`/api/fx-rate?to=${currency}`);
  if (!res.ok) throw new Error("Failed to fetch FX rate");
  return res.json();
}

export function usdcToLocal(usdc: number, rate: number, currency: Currency): string {
  return `${((usdc / 1_000_000) * rate).toFixed(2)} ${currency}`;
}
