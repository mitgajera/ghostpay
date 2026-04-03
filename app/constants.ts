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
