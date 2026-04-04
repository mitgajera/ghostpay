export const APP_NAME = "GhostPay";
export const APP_TAGLINE = "Pay your team. Leave no trace.";

// MagicBlock endpoints
export const TEE_RPC_URL  = "https://tee.magicblock.app";
export const TEE_WS_URL   = "wss://tee.magicblock.app";
export const PAYMENTS_API = "https://payments.magicblock.app";

// Devnet USDC mint (Circle devnet)
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// ─── Stablecoins ─────────────────────────────────────────────────────────────
// Logos: CoinGecko CDN (stable, widely cached)
export const STABLECOINS = {
  USDC: {
    symbol: "USDC",
    name:   "USD Coin",
    mint:   "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    decimals: 6,
    color:    "#2775ca",
    bgColor:  "rgba(39,117,202,0.10)",
    logo:     "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  },
  USDT: {
    symbol: "USDT",
    name:   "Tether USD",
    mint:   "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    color:    "#26a17b",
    bgColor:  "rgba(38,161,123,0.10)",
    logo:     "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  },
  PYUSD: {
    symbol: "PYUSD",
    name:   "PayPal USD",
    mint:   "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    decimals: 6,
    color:    "#003087",
    bgColor:  "rgba(0,48,135,0.12)",
    logo:     "https://assets.coingecko.com/coins/images/31212/small/PYUSD_Logo_%282%29.png",
  },
  EURC: {
    symbol: "EURC",
    name:   "Euro Coin",
    mint:   "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
    decimals: 6,
    color:    "#8b5cf6",
    bgColor:  "rgba(139,92,246,0.10)",
    logo:     "https://assets.coingecko.com/coins/images/26045/small/euro-coin.png",
  },
  USDG: {
    symbol: "USDG",
    name:   "Global Dollar",
    mint:   "2u1tszSeqP4LxBJsbSfGMDf8BXWY2KTJQ9VHknCXzVLd",
    decimals: 6,
    color:    "#f59e0b",
    bgColor:  "rgba(245,158,11,0.10)",
    logo:     "https://s2.coinmarketcap.com/static/img/coins/64x64/33793.png",
  },
} as const;

export type StablecoinSymbol = keyof typeof STABLECOINS;
export const STABLECOIN_SYMBOLS = Object.keys(STABLECOINS) as StablecoinSymbol[];

// ─── Ticker crypto logos (Binance-sourced prices) ─────────────────────────────
// CoinGecko image CDN — stable URLs, 27×27 px
export const CRYPTO_LOGOS: Record<string, string> = {
  BTC:   "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH:   "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  SOL:   "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  BNB:   "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  USDC:  "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT:  "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  PYUSD: "https://assets.coingecko.com/coins/images/31212/small/PYUSD_Logo_%282%29.png",
  EURC:  "https://assets.coingecko.com/coins/images/26045/small/euro-coin.png",
  USDG:  "https://s2.coinmarketcap.com/static/img/coins/64x64/33793.png",
};

// MagicBlock program IDs
export const PERMISSION_PROGRAM_ID = "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1";
export const DELEGATION_PROGRAM_ID = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";

// TEE validator (devnet)
export const TEE_VALIDATOR = "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA";

// Anchor program PDA seed
export const GHOST_PAY_SEED = "ghostpay";

// ─── Currencies ───────────────────────────────────────────────────────────────
export const CURRENCIES = [
  "USD", "EUR", "GBP", "SGD", "AUD", "JPY",
  "CAD", "CHF", "INR", "AED", "HKD", "KRW",
  "BRL", "MXN", "NZD", "PHP", "NGN", "ZAR",
] as const;
export type Currency = typeof CURRENCIES[number];

// Flag images: flagcdn.com (free, no key) — countryCode is ISO 3166-1 alpha-2
// Flag URL: https://flagcdn.com/w40/{countryCode}.png
export const CURRENCY_META: Record<Currency, { flag: string; name: string; countryCode: string }> = {
  USD: { flag: "🇺🇸", name: "US Dollar",          countryCode: "us" },
  EUR: { flag: "🇪🇺", name: "Euro",                countryCode: "eu" },
  GBP: { flag: "🇬🇧", name: "British Pound",       countryCode: "gb" },
  SGD: { flag: "🇸🇬", name: "Singapore Dollar",    countryCode: "sg" },
  AUD: { flag: "🇦🇺", name: "Australian Dollar",   countryCode: "au" },
  JPY: { flag: "🇯🇵", name: "Japanese Yen",        countryCode: "jp" },
  CAD: { flag: "🇨🇦", name: "Canadian Dollar",     countryCode: "ca" },
  CHF: { flag: "🇨🇭", name: "Swiss Franc",         countryCode: "ch" },
  INR: { flag: "🇮🇳", name: "Indian Rupee",        countryCode: "in" },
  AED: { flag: "🇦🇪", name: "UAE Dirham",          countryCode: "ae" },
  HKD: { flag: "🇭🇰", name: "Hong Kong Dollar",    countryCode: "hk" },
  KRW: { flag: "🇰🇷", name: "South Korean Won",    countryCode: "kr" },
  BRL: { flag: "🇧🇷", name: "Brazilian Real",      countryCode: "br" },
  MXN: { flag: "🇲🇽", name: "Mexican Peso",        countryCode: "mx" },
  NZD: { flag: "🇳🇿", name: "New Zealand Dollar",  countryCode: "nz" },
  PHP: { flag: "🇵🇭", name: "Philippine Peso",     countryCode: "ph" },
  NGN: { flag: "🇳🇬", name: "Nigerian Naira",      countryCode: "ng" },
  ZAR: { flag: "🇿🇦", name: "South African Rand",  countryCode: "za" },
};

// Schedule cadences
export const CADENCES = ["weekly", "biweekly", "monthly"] as const;
export type Cadence = typeof CADENCES[number];

// localStorage keys
export const LS_TEMPLATES   = "ghostpay_templates";
export const LS_SCHEDULES   = "ghostpay_schedules";
export const LS_ADDRESSBOOK = "ghostpay_addressbook";
export const LS_HISTORY     = "ghostpay_history";
export const LS_PAYMENTS    = "ghostpay_payments_"; // + walletAddress

// Solana Explorer
export const EXPLORER_BASE = "https://explorer.solana.com/tx";

// Design system colors
export const COLORS = {
  black:    "#0a0a0a",
  white:    "#fafaf8",
  ghost:    "#e8e6e1",
  ghost2:   "#d0cdc6",
  ghostDim: "#b8b5ae",
  green:    "#1a7a4a",
  greenBg:  "#e8f5ee",
  surface:  "#111111",
  surface2: "#161616",
  border:   "#1e1e1e",
  border2:  "#2a2a2a",
} as const;
