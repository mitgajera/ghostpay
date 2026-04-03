import type { NextApiRequest, NextApiResponse } from "next";

const BASE_CURRENCY = "USD";

// Open Exchange Rates free tier (no key required for base USD)
// Falls back to hardcoded rates if network fails
const FALLBACK_RATES: Record<string, number> = {
  SGD: 1.35,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  JPY: 149.5,
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
