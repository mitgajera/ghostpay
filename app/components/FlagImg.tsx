import { useState } from "react";
import { CURRENCY_META, Currency } from "../constants";

interface Props {
  currency: string;
  size?: number; // height in px; width is auto (flags are ~3:2 ratio)
  className?: string;
}

export default function FlagImg({ currency, size = 14, className = "" }: Props) {
  const [err, setErr] = useState(false);
  const meta = CURRENCY_META[currency as Currency];

  if (!meta?.countryCode || err) {
    // Emoji fallback
    return (
      <span className={`inline-block leading-none ${className}`} style={{ fontSize: size }}>
        {meta?.flag ?? "🏳️"}
      </span>
    );
  }

  // flagcdn.com: free, no key, supports "eu" for Euro flag
  // Use 2× pixel density: request w40 for 14–20px display
  const pxWidth = size >= 18 ? 40 : 20;
  const src = `https://flagcdn.com/w${pxWidth}/${meta.countryCode}.png`;
  const srcSet = `https://flagcdn.com/w${pxWidth}/${meta.countryCode}.png 1x, https://flagcdn.com/w${pxWidth * 2}/${meta.countryCode}.png 2x`;

  return (
    <img
      src={src}
      srcSet={srcSet}
      alt={meta.countryCode.toUpperCase()}
      width={Math.round(size * 1.5)}
      height={size}
      className={`inline-block object-cover shrink-0 ${className}`}
      style={{ borderRadius: 2 }}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}
