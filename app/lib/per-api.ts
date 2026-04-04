/**
 * per-api.ts — Private Payments API wrapper
 *
 * Real endpoint base: https://payments.magicblock.app/v1/spl/
 * OpenAPI spec:       https://payments.magicblock.app/doc
 *
 * All build* functions return unsigned base64 transactions.
 * Caller must sign with wallet and send to the correct cluster:
 *   sendTo === "base"      → Solana devnet connection
 *   sendTo === "ephemeral" → TEE RPC connection (authenticated URL)
 *
 * All functions accept a `mint` parameter so any supported stablecoin
 * (USDC, USDT, PYUSD, EURC, USDG …) can be used transparently.
 */

import { Connection, Transaction } from "@solana/web3.js";
import { PAYMENTS_API, STABLECOINS } from "../constants";

const DEFAULT_MINT = STABLECOINS.USDC.mint;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TxPayload {
  kind: string;
  transactionBase64: string;
  sendTo: "base" | "ephemeral";
  recentBlockhash: string;
  lastValidBlockHeight: number;
  instructionCount: number;
  requiredSigners: string[];
  validator?: string;
}

export interface BalanceResponse {
  address: string;
  mint: string;
  ata: string;
  location: "base" | "ephemeral";
  balance: string; // string representation of u64
}

export interface MintInitializationResponse {
  mint: string;
  validator: string;
  transferQueue: string;
  initialized: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function post(path: string, body: object, authToken?: string): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${PAYMENTS_API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed (${res.status}): ${text}`);
  }
  return res;
}

async function get(path: string, params: Record<string, string>, authToken?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${PAYMENTS_API}${path}?${qs}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${text}`);
  }
  return res;
}

// ─── Mint initialization ──────────────────────────────────────────────────────

export async function isMintInitialized(mint: string = DEFAULT_MINT): Promise<MintInitializationResponse> {
  const res = await get("/v1/spl/is-mint-initialized", { mint, cluster: "devnet" });
  return res.json();
}

export async function buildInitializeMint(payer: string, mint: string = DEFAULT_MINT): Promise<TxPayload> {
  const res = await post("/v1/spl/initialize-mint", { payer, mint, cluster: "devnet" });
  return res.json();
}

// ─── Core flow ────────────────────────────────────────────────────────────────

/**
 * Step 1 — Deposit stablecoin from Solana devnet into the ephemeral rollup (PER).
 * sendTo: "base" → sign and send to Solana devnet.
 */
export async function buildDeposit(
  owner: string,
  amountLamports: number,
  mint: string = DEFAULT_MINT,
  opts: { initIfMissing?: boolean; initVaultIfMissing?: boolean; initAtasIfMissing?: boolean } = {
    initIfMissing: true,
    initVaultIfMissing: true,
    initAtasIfMissing: true,
  }
): Promise<TxPayload> {
  const res = await post("/v1/spl/deposit", {
    owner,
    mint,
    amount: amountLamports,
    cluster: "devnet",
    initIfMissing: opts.initIfMissing ?? true,
    initVaultIfMissing: opts.initVaultIfMissing ?? true,
    initAtasIfMissing: opts.initAtasIfMissing ?? true,
  });
  return res.json();
}

/**
 * Step 2 — Private transfer via the PrivatePaymentsProg.
 * Default route: fromBalance="base", toBalance="ephemeral" — the GhostPay payroll route.
 */
export async function buildPrivateTransfer(
  from: string,
  to: string,
  amountLamports: number,
  authToken: string,
  mint: string = DEFAULT_MINT,
  fromBalance: "base" | "ephemeral" = "base",
  toBalance: "base" | "ephemeral" = "ephemeral",
): Promise<TxPayload> {
  const res = await post(
    "/v1/spl/transfer",
    {
      from,
      to,
      mint,
      amount: amountLamports,
      visibility: "private",
      fromBalance,
      toBalance,
      cluster: "devnet",
      initIfMissing: true,
      initAtasIfMissing: true,
      initVaultIfMissing: true,
    },
    authToken
  );
  return res.json();
}

/**
 * Step 3 — Withdraw stablecoin from the PER back to the owner's Solana devnet wallet.
 * sendTo: "base" → sign and send to Solana devnet.
 */
export async function buildWithdraw(
  owner: string,
  amountLamports: number,
  authToken: string,
  mint: string = DEFAULT_MINT,
): Promise<TxPayload> {
  const res = await post(
    "/v1/spl/withdraw",
    { owner, mint, amount: amountLamports, cluster: "devnet" },
    authToken
  );
  return res.json();
}

// ─── Balances ─────────────────────────────────────────────────────────────────

/** Get public stablecoin balance on Solana devnet (base chain). */
export async function getPublicBalance(address: string, mint: string = DEFAULT_MINT): Promise<BalanceResponse> {
  const res = await get("/v1/spl/balance", { address, mint, cluster: "devnet" });
  return res.json();
}

/** Get private stablecoin balance inside the ephemeral rollup. Requires auth token. */
export async function getPrivateBalance(
  address: string,
  authToken: string,
  mint: string = DEFAULT_MINT,
): Promise<BalanceResponse> {
  const res = await get(
    "/v1/spl/private-balance",
    { address, mint, cluster: "devnet" },
    authToken
  );
  return res.json();
}

// ─── Send helper ──────────────────────────────────────────────────────────────

export async function signAndSend(
  payload: TxPayload,
  connection: Connection,
  teeConnection: Connection,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const conn = payload.sendTo === "base" ? connection : teeConnection;

  const txBytes = Buffer.from(payload.transactionBase64, "base64");
  let tx = Transaction.from(txBytes);

  if (payload.sendTo === "ephemeral") {
    const { blockhash } = await teeConnection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
  }

  tx = await signTransaction(tx);
  return conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
}
