export const APP_NAME = "GhostPay";
export const APP_TAGLINE = "Pay your team. Leave no trace.";

// MagicBlock endpoints
export const TEE_RPC_URL = "https://tee.magicblock.app";
export const TEE_WS_URL  = "wss://tee.magicblock.app";
export const PAYMENTS_API = "https://payments.magicblock.app";

// Devnet USDC mint (Circle devnet)
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// MagicBlock program IDs
export const PERMISSION_PROGRAM_ID = "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1";
export const DELEGATION_PROGRAM_ID = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";

// TEE validator (devnet)
export const TEE_VALIDATOR = "FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA";

// Anchor program PDA seed
export const GHOST_PAY_SEED = "ghostpay";

// Supported currencies
export const CURRENCIES = ["SGD", "EUR", "GBP", "AUD", "JPY"] as const;
export type Currency = typeof CURRENCIES[number];

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
