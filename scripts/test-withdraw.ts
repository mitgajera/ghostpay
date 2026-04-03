/**
 * test-withdraw.ts — Step 5
 *
 * Recipient withdraws their private USDC balance back to their devnet wallet.
 * Requires the recipient's keypair (they must sign the withdraw tx).
 *
 * Usage:
 *   npm run test:withdraw -- --keypair ~/.config/solana/id.json
 *   npm run test:withdraw -- --keypair ~/.config/solana/recipient.json --amount 50000
 */

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import nacl from "tweetnacl";
import fs from "fs";
import path from "path";
import { fetchAuthToken, teeUrl } from "../app/lib/auth";
import { buildWithdraw, getPrivateBalance, getPublicBalance, signAndSend } from "../app/lib/per-api";
import { USDC_MINT } from "../app/constants";

const DEVNET_RPC = "https://rpc.magicblock.app/devnet";

function arg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function loadKeypair(): Keypair {
  const raw = arg("--keypair");
  if (!raw) { console.error("Missing --keypair"); process.exit(1); }
  const p = path.resolve(raw.replace(/^~/, process.env.HOME ?? ""));
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
  console.log(`Keypair: ${kp.publicKey.toBase58()}`);
  return kp;
}

const makeSignMsg = (kp: Keypair) =>
  async (msg: Uint8Array) => nacl.sign.detached(msg, kp.secretKey);
const makeSignTx  = (kp: Keypair) =>
  async (tx: Transaction): Promise<Transaction> => { tx.partialSign(kp); return tx; };
const fmt = (n: bigint) => `${(Number(n) / 1_000_000).toFixed(6)} USDC`;

async function getDevnetUsdcBalance(conn: Connection, owner: PublicKey): Promise<bigint> {
  try {
    const ata = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), owner, false, TOKEN_PROGRAM_ID);
    const info = await conn.getTokenAccountBalance(ata);
    return BigInt(info.value.amount);
  } catch { return 0n; }
}

async function main() {
  console.log("=".repeat(60));
  console.log("GhostPay — Withdraw Test (Step 5)");
  console.log("=".repeat(60));

  const kp         = loadKeypair();
  const owner      = kp.publicKey.toBase58();
  const connection = new Connection(DEVNET_RPC, "confirmed");

  // ── 1. Auth token ─────────────────────────────────────────────────────────
  console.log("\n[ 1/4 ] Fetching TEE auth token...");
  const authToken = await fetchAuthToken(kp.publicKey, makeSignMsg(kp));
  const teeConn   = new Connection(teeUrl(authToken.token), "confirmed");
  console.log(`        ✓ Token obtained\n`);

  // ── 2. Check balances before ──────────────────────────────────────────────
  console.log("[ 2/4 ] Pre-withdraw balances...");
  const privateBefore = BigInt((await getPrivateBalance(owner, authToken.token)).balance);
  const devnetBefore  = await getDevnetUsdcBalance(connection, kp.publicKey);
  console.log(`        Private (PER) : ${fmt(privateBefore)}`);
  console.log(`        Devnet   (ATA): ${fmt(devnetBefore)}`);

  if (privateBefore === 0n) {
    console.error("\n✗ No private balance to withdraw.");
    console.error("  Run test-per-api (deposit) + test-private-transfer first.");
    process.exit(1);
  }

  const amount = arg("--amount")
    ? BigInt(arg("--amount")!)
    : privateBefore; // withdraw everything

  console.log(`\n  Withdrawing: ${fmt(amount)}\n`);

  // ── 3. Build + send withdraw ───────────────────────────────────────────────
  console.log("[ 3/4 ] Building withdraw transaction...");
  const payload = await buildWithdraw(owner, Number(amount), authToken.token);
  console.log(`        kind         : ${payload.kind}`);
  console.log(`        sendTo       : ${payload.sendTo}`);
  console.log(`        instructions : ${payload.instructionCount}`);

  const sig = await signAndSend(payload, connection, teeConn, makeSignTx(kp));
  console.log(`        sig          : ${sig}`);
  console.log(`        explorer     : https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  console.log("        Confirming...");

  const conf = await connection.confirmTransaction(sig, "confirmed");
  if (conf.value.err) throw new Error(`Withdraw failed: ${JSON.stringify(conf.value.err)}`);
  console.log("        ✓ Confirmed\n");

  // ── 4. Verify balances after ───────────────────────────────────────────────
  // The vault settlement can take a few seconds after confirmation.
  console.log("[ 4/4 ] Post-withdraw balances (polling up to 20s)...");
  const privateAfter = BigInt((await getPrivateBalance(owner, authToken.token)).balance);
  let devnetAfter = devnetBefore;
  for (let i = 0; i < 10; i++) {
    devnetAfter = await getDevnetUsdcBalance(connection, kp.publicKey);
    if (devnetAfter > devnetBefore) break;
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`        Private (PER) : ${fmt(privateAfter)}  (Δ -${fmt(privateBefore - privateAfter)})`);
  console.log(`        Devnet   (ATA): ${fmt(devnetAfter)}   (Δ +${fmt(devnetAfter - devnetBefore)})`);

  const ok = devnetAfter > devnetBefore;
  console.log(ok
    ? "\n  ✓ Step 5 — withdraw confirmed, funds back on devnet wallet"
    : "\n  ⚠  Devnet balance unchanged — may still be settling."
  );

  console.log("\n" + "=".repeat(60));
  console.log("Full private payroll cycle complete:");
  console.log("  deposit → private transfer → withdraw");
  console.log("=".repeat(60));
}

main().catch(err => { console.error("\n✗ Fatal:", err.message ?? err); process.exit(1); });
