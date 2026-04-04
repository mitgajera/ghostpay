import { useState } from "react";
import { CRYPTO_LOGOS, STABLECOINS, StablecoinSymbol } from "../constants";

interface Props {
  symbol: string;
  size?: number;
  className?: string;
}

export default function CoinImg({ symbol, size = 18, className = "" }: Props) {
  const [err, setErr] = useState(false);

  // Resolve logo URL: check STABLECOINS first (has `logo`), then CRYPTO_LOGOS
  const logoUrl =
    !err &&
    (STABLECOINS[symbol as StablecoinSymbol]?.logo ?? CRYPTO_LOGOS[symbol]);

  if (!logoUrl) {
    // Colored circle fallback using the stablecoin color if available
    const color = STABLECOINS[symbol as StablecoinSymbol]?.color ?? "#444";
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full font-mono font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, background: color, fontSize: size * 0.4, color: "#fff" }}
      >
        {symbol[0]}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className={`rounded-full shrink-0 object-cover ${className}`}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}
