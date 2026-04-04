import type { NextApiRequest, NextApiResponse } from "next";

const BASE_CURRENCY = "USD";

const FALLBACK_RATES: Record<string, number> = {
  USD: 1.00,
  EUR: 0.92,
  GBP: 0.79,
  SGD: 1.35,
  AUD: 1.53,
  JPY: 149.5,
  CAD: 1.36,
  CHF: 0.90,
  INR: 83.2,
  AED: 3.67,
  HKD: 7.83,
  KRW: 1330,
  BRL: 4.97,
  MXN: 17.2,
  NZD: 1.63,
  PHP: 56.4,
  NGN: 1520,
  ZAR: 18.9,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { to } = req.query;
  if (!to || typeof to !== "string") {
    return res.status(400).json({ error: "Missing 'to' currency" });
  }

  try {
    const r = await fetch(
      `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`,
      { next: { revalidate: 3600 } } as RequestInit
    );
    if (!r.ok) throw new Error("upstream failed");
    const data = await r.json();
    const rate: number = data.rates?.[to] ?? FALLBACK_RATES[to];
    if (!rate) return res.status(400).json({ error: `Unknown currency: ${to}` });

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.json({ from: BASE_CURRENCY, to, rate, fetchedAt: Date.now() });
  } catch {
    const rate = FALLBACK_RATES[to];
    if (!rate) return res.status(400).json({ error: `Unknown currency: ${to}` });
    return res.json({ from: BASE_CURRENCY, to, rate, fetchedAt: Date.now(), fallback: true });
  }
}
