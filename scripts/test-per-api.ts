/**
 * test-per-api.ts
 *
 * Tests the per-api.ts deposit flow against payments.magicblock.app on devnet.
 * Steps tested:
 *   1. Check mint initialization (initialize if needed)
 *   2. buildDeposit → signAndSend → confirmTransaction on Solana devnet
 *   3. getPublicBalance before and after deposit
 *
 * Prerequisites:
 *   - A Solana devnet keypair with SOL for fees (~0.01 SOL) and devnet USDC
 *   - Get devnet USDC: https://spl-token-faucet.com/?token-name=USDC-Dev
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/test-per-api.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/test-per-api.ts --keypair ~/.config/solana/id.json
 *   npx ts-node --project tsconfig.scripts.json scripts/test-per-api.ts --keypair ./my-wallet.json --amount 100000
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import nacl from "tweetnacl";
import fs from "fs";
import path from "path";
import {
  buildDeposit,
  buildInitializeMint,
  getPublicBalance,
  isMintInitialized,
  signAndSend,
} from "../app/lib/per-api";
import { USDC_MINT } from "../app/constants";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEVNET_RPC = "https://rpc.magicblock.app/devnet";
const TEE_RPC    = "https://tee.magicblock.app"; // fallback; deposit goes to base anyway
const DEFAULT_DEPOSIT_LAMPORTS = 100_000; // 0.1 USDC — small enough for a test

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadOrGenerateKeypair(): Keypair {
  const idx = process.argv.indexOf("--keypair");
  if (idx !== -1) {
    const raw = process.argv[idx + 1].replace("~", process.env.HOME ?? process.env.USERPROFILE ?? "");
    const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(raw), "utf-8"))));
    console.log(`Loaded keypair: ${path.resolve(raw)}`);
    return kp;
  }
  const kp = Keypair.generate();
  console.log("Generated ephemeral keypair (no funds — will fail at send; use --keypair for a real test)");
  return kp;
}

function parseAmount(): number {
  const idx = process.argv.indexOf("--amount");
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : DEFAULT_DEPOSIT_LAMPORTS;
}

/** Wallet-adapter-compatible signTransaction for a raw Keypair. */
function makeSignTransaction(keypair: Keypair) {
  return async (tx: Transaction): Promise<Transaction> => {
    tx.partialSign(keypair);
    return tx;
  };
}

async function getSolBalance(conn: Connection, pk: PublicKey): Promise<number> {
  return conn.getBalance(pk);
}

async function getUsdcTokenBalance(conn: Connection, owner: PublicKey): Promise<bigint> {
  try {
    const ata = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), owner, false, TOKEN_PROGRAM_ID);
    const info = await conn.getTokenAccountBalance(ata);
    return BigInt(info.value.amount);
  } catch {
    return 0n;
  }
}

function fmt(lamports: bigint): string {
  const usdc = Number(lamports) / 1_000_000;
  return `${usdc.toFixed(6)} USDC (${lamports} lamports)`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("GhostPay — per-api.ts Deposit Test");
  console.log("Target: payments.magicblock.app (devnet)");
  console.log("=".repeat(60));

  const keypair     = loadOrGenerateKeypair();
  const depositAmt  = parseAmount();
  const owner       = keypair.publicKey.toBase58();
  const connection  = new Connection(DEVNET_RPC, "confirmed");
  const teeConn     = new Connection(TEE_RPC, "confirmed");

  console.log(`Wallet  : ${owner}`);
  console.log(`Deposit : ${fmt(BigInt(depositAmt))}\n`);

  // ── Pre-flight balance check ────────────────────────────────────────────────
  console.log("[ pre ] Checking balances...");
  const solBefore  = await getSolBalance(connection, keypair.publicKey);
  const usdcBefore = await getUsdcTokenBalance(connection, keypair.publicKey);
  console.log(`        SOL  : ${(solBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`        USDC : ${fmt(usdcBefore)}`);

  if (usdcBefore < BigInt(depositAmt)) {
    console.error(`\n✗ Insufficient devnet USDC.`);
    console.error(`  Have : ${fmt(usdcBefore)}`);
    console.error(`  Need : ${fmt(BigInt(depositAmt))}`);
    console.error(`\n  Get devnet USDC at: https://spl-token-faucet.com/?token-name=USDC-Dev`);
    console.error(`  Or request from the MagicBlock team at: https://t.me/+oLOcE79hoqo3OWJi`);
    process.exit(1);
  }
  if (solBefore < 10_000_000) { // < 0.01 SOL
    console.warn(`\n⚠  Low SOL balance (${(solBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL). May not have enough for fees.`);
    console.warn(`   Run: solana airdrop 1 ${owner} --url devnet`);
  }

  // Also check via payments API
  try {
    const apiBalance = await getPublicBalance(owner);
    console.log(`        API  : ${apiBalance.balance} lamports (via payments API)\n`);
  } catch (e: any) {
    console.log(`        API  : ${e.message} (balance endpoint — continuing)\n`);
  }

  // ── Step 1: Mint initialization check ──────────────────────────────────────
  console.log("[ 1/3 ] Checking mint initialization...");
  const mintStatus = await isMintInitialized();
  console.log(`        Initialized : ${mintStatus.initialized}`);
  console.log(`        Validator   : ${mintStatus.validator}`);
  console.log(`        TransferQ   : ${mintStatus.transferQueue}`);

  if (!mintStatus.initialized) {
    console.log("        Mint not initialized — building initializeMint tx...");
    const initPayload = await buildInitializeMint(owner);
    console.log(`        sendTo      : ${initPayload.sendTo} (${initPayload.instructionCount} instructions)`);

    const initSig = await signAndSend(initPayload, connection, teeConn, makeSignTransaction(keypair));
    console.log(`        sig         : ${initSig}`);
    console.log("        Confirming...");
    const confirmation = await connection.confirmTransaction(initSig, "confirmed");
    if (confirmation.value.err) throw new Error(`initializeMint failed: ${JSON.stringify(confirmation.value.err)}`);
    console.log(`        ✓ Mint initialized\n`);
  } else {
    console.log("        ✓ Already initialized\n");
  }

  // ── Step 2: Build deposit ───────────────────────────────────────────────────
  console.log("[ 2/3 ] Building deposit transaction...");
  const depositPayload = await buildDeposit(owner, depositAmt);
  console.log(`        kind         : ${depositPayload.kind}`);
  console.log(`        sendTo       : ${depositPayload.sendTo}`);
  console.log(`        instructions : ${depositPayload.instructionCount}`);
  console.log(`        signers      : ${depositPayload.requiredSigners.join(", ")}`);
  console.log(`        blockhash    : ${depositPayload.recentBlockhash}`);

  if (depositPayload.sendTo !== "base") {
    throw new Error(`Expected deposit sendTo="base", got "${depositPayload.sendTo}"`);
  }

  // ── Step 3: Sign and send ───────────────────────────────────────────────────
  console.log("\n[ 3/3 ] Signing and sending to Solana devnet...");
  const depositSig = await signAndSend(depositPayload, connection, teeConn, makeSignTransaction(keypair));
  console.log(`        sig : ${depositSig}`);
  console.log(`        explorer: https://explorer.solana.com/tx/${depositSig}?cluster=devnet`);

  console.log("        Confirming...");
  const confirmation = await connection.confirmTransaction(depositSig, "confirmed");
  if (confirmation.value.err) {
    throw new Error(`Deposit failed: ${JSON.stringify(confirmation.value.err)}`);
  }
  console.log(`        ✓ Confirmed\n`);

  // ── Post balance check ──────────────────────────────────────────────────────
  console.log("[ done ] Post-deposit balances:");
  const usdcAfter = await getUsdcTokenBalance(connection, keypair.publicKey);
  const solAfter  = await getSolBalance(connection, keypair.publicKey);
  console.log(`         SOL  : ${(solAfter / LAMPORTS_PER_SOL).toFixed(6)} SOL  (Δ ${((solAfter - solBefore) / LAMPORTS_PER_SOL).toFixed(6)})`);
  console.log(`         USDC : ${fmt(usdcAfter)}  (Δ ${fmt(usdcBefore - usdcAfter)} deposited)`);

  console.log("\n" + "=".repeat(60));
  console.log("Deposit confirmed on devnet. Step 2 complete.");
  console.log("USDC is now inside the Private Ephemeral Rollup.");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n✗ Fatal:", err.message ?? err);
  process.exit(1);
});
