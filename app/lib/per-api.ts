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
 */

import { Connection, Transaction } from "@solana/web3.js";
import { PAYMENTS_API, USDC_MINT } from "../constants";

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

/**
 * Check whether the validator-scoped transfer queue is initialized for a mint.
 * Must be called before the first deposit — call `buildInitializeMint` if false.
 */
export async function isMintInitialized(): Promise<MintInitializationResponse> {
  const res = await get("/v1/spl/is-mint-initialized", {
    mint: USDC_MINT,
    cluster: "devnet",
  });
  return res.json();
}

/**
 * Build the one-time setup transaction that initializes the validator's
 * transfer queue for the USDC mint. Must be signed and sent to "base" (devnet).
 * Only needed once per mint per validator — idempotent after first run.
 */
export async function buildInitializeMint(payer: string): Promise<TxPayload> {
  const res = await post("/v1/spl/initialize-mint", {
    payer,
    mint: USDC_MINT,
    cluster: "devnet",
  });
  return res.json();
}

// ─── Core flow ────────────────────────────────────────────────────────────────

/**
 * Step 1 — Deposit USDC from Solana devnet into the ephemeral rollup (PER).
 * sendTo: "base" → sign and send to Solana devnet.
 * Pass initIfMissing/initVaultIfMissing/initAtasIfMissing: true to auto-create
 * any missing accounts on the first deposit.
 */
export async function buildDeposit(
  owner: string,
  amountLamports: number,
  opts: { initIfMissing?: boolean; initVaultIfMissing?: boolean; initAtasIfMissing?: boolean } = {
    initIfMissing: true,
    initVaultIfMissing: true,
    initAtasIfMissing: true,
  }
): Promise<TxPayload> {
  const res = await post("/v1/spl/deposit", {
    owner,
    mint: USDC_MINT,
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
 *
 * Default route: fromBalance="base", toBalance="ephemeral"
 *   - Takes USDC from sender's devnet ATA.
 *   - Recipient's EATA is initialized + delegated automatically if it doesn't
 *     exist yet (signed only by sender — no recipient keypair needed).
 *   - Recipient's PRIVATE balance is updated (visible via getPrivateBalance).
 *   - sendTo = "base" (9 instructions, goes to Solana devnet).
 *   - This is the correct GhostPay payroll route.
 *
 * Other combinations:
 *   fromBalance="base",      toBalance="base"      → sends to recipient's devnet ATA (not private)
 *   fromBalance="ephemeral", toBalance="ephemeral" → direct TEE transfer; requires full
 *                                                    DelegationProg ATA setup (not done by deposit)
 */
export async function buildPrivateTransfer(
  from: string,
  to: string,
  amountLamports: number,
  authToken: string,
  fromBalance: "base" | "ephemeral" = "base",
  toBalance: "base" | "ephemeral" = "ephemeral",
): Promise<TxPayload> {
  const res = await post(
    "/v1/spl/transfer",
    {
      from,
      to,
      mint: USDC_MINT,
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
 * Step 3 — Withdraw USDC from the PER back to the owner's Solana devnet wallet.
 * sendTo: "base" → sign and send to Solana devnet.
 */
export async function buildWithdraw(
  owner: string,
  amountLamports: number,
  authToken: string
): Promise<TxPayload> {
  const res = await post(
    "/v1/spl/withdraw",
    {
      owner,
      mint: USDC_MINT,
      amount: amountLamports,
      cluster: "devnet",
    },
    authToken
  );
  return res.json();
}

// ─── Balances ─────────────────────────────────────────────────────────────────

/** Get public USDC balance on Solana devnet (base chain). */
export async function getPublicBalance(address: string): Promise<BalanceResponse> {
  const res = await get("/v1/spl/balance", {
    address,
    mint: USDC_MINT,
    cluster: "devnet",
  });
  return res.json();
}

/**
 * Get private USDC balance inside the ephemeral rollup.
 * Requires a valid auth token obtained via fetchAuthToken().
 */
export async function getPrivateBalance(
  address: string,
  authToken: string
): Promise<BalanceResponse> {
  const res = await get(
    "/v1/spl/private-balance",
    { address, mint: USDC_MINT, cluster: "devnet" },
    authToken
  );
  return res.json();
}

// ─── Send helper ──────────────────────────────────────────────────────────────

/**
 * Deserialize a base64 transaction from a TxPayload, sign it, and send it to
 * the correct connection based on payload.sendTo:
 *   "base"      → Solana devnet
 *   "ephemeral" → TEE RPC (use teeUrl(token) as the connection endpoint)
 *
 * Returns the transaction signature.
 */
export async function signAndSend(
  payload: TxPayload,
  connection: Connection,
  teeConnection: Connection,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const conn = payload.sendTo === "base" ? connection : teeConnection;

  const txBytes = Buffer.from(payload.transactionBase64, "base64");
  let tx = Transaction.from(txBytes);

  // The payments API fetches the blockhash from its own base-chain RPC.
  // The TEE RPC runs an independent slot clock — it will reject any blockhash
  // it hasn't seen. For ephemeral transactions, swap in a fresh TEE blockhash
  // before signing so the signature covers the correct value.
  if (payload.sendTo === "ephemeral") {
    const { blockhash } = await teeConnection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
  }

  tx = await signTransaction(tx);
  return conn.sendRawTransaction(tx.serialize(), { skipPreflight: true });
}
