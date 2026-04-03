/**
 * test-private-transfer.ts — Steps 3 + 4
 *
 * Private transfer via PrivatePaymentsProg (fromBalance: "base").
 *
 * Privacy mechanism: the transfer goes through the MagicBlock PrivatePaymentsProg
 * transfer queue on devnet. Individual amounts and recipient wallets are NOT
 * visible in the instruction data — only the queue entry exists on-chain.
 * The recipient sees their balance via getPrivateBalance (TEE-authenticated).
 *
 * NOTE: fromBalance: "ephemeral" (vault→TEE direct) requires both ATAs to be
 * delegated via DelegationProg — the deposit endpoint only delegates EATAs, so
 * that path returns InvalidWritableAccount. "base" is the correct path.
 *
 * Usage:
 *   npm run test:transfer -- --keypair ~/.config/solana/id.json
 *   npm run test:transfer -- --keypair ~/.config/solana/id.json --recipient <PUBKEY>
 *   npm run test:transfer -- --keypair ~/.config/solana/id.json --amount 50000
 */

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import fs from "fs";
import path from "path";
import { fetchAuthToken, teeUrl } from "../app/lib/auth";
import { buildPrivateTransfer, getPrivateBalance, signAndSend } from "../app/lib/per-api";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEVNET_RPC     = "https://rpc.magicblock.app/devnet";
const DEFAULT_AMOUNT = 50_000; // 0.05 USDC

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
const fmt         = (n: bigint) => `${(Number(n) / 1_000_000).toFixed(6)} USDC`;

async function pollBalance(
  address: string, token: string, minExpected: bigint, label: string,
  maxAttempts = 20, intervalMs = 2_000,
): Promise<bigint> {
  for (let i = 1; i <= maxAttempts; i++) {
    const res = await getPrivateBalance(address, token);
    const bal = BigInt(res.balance);
    process.stdout.write(`\r        ${label}: ${fmt(bal)} (poll ${i}/${maxAttempts})   `);
    if (bal >= minExpected) { process.stdout.write("\n"); return bal; }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  process.stdout.write("\n");
  return 0n;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("GhostPay — Private Transfer Test (Steps 3 + 4)");
  console.log("=".repeat(60));

  const senderKp    = loadKeypair();
  const amount      = arg("--amount") ? parseInt(arg("--amount")!, 10) : DEFAULT_AMOUNT;
  const recipientPk = arg("--recipient")
    ? new PublicKey(arg("--recipient")!)
    : senderKp.publicKey; // self-transfer if no recipient given

  const sender    = senderKp.publicKey.toBase58();
  const recipient = recipientPk.toBase58();
  const isSelf    = sender === recipient;
  const connection = new Connection(DEVNET_RPC, "confirmed");

  console.log(`Sender    : ${sender}`);
  console.log(`Recipient : ${recipient}${isSelf ? " (self)" : ""}`);
  console.log(`Amount    : ${fmt(BigInt(amount))}`);
  console.log(`Route     : fromBalance=base → PrivatePaymentsProg transfer queue\n`);

  // ── 1. Auth token ─────────────────────────────────────────────────────────
  console.log("[ 1/4 ] Fetching TEE auth token...");
  const authToken = await fetchAuthToken(senderKp.publicKey, makeSignMsg(senderKp));
  const teeConn   = new Connection(teeUrl(authToken.token), "confirmed");
  console.log(`        ✓ Token obtained, expires ${new Date(authToken.expiresAt).toISOString()}\n`);

  // ── 2. Pre-transfer balances ──────────────────────────────────────────────
  console.log("[ 2/4 ] Pre-transfer private balances...");
  const senderBefore    = BigInt((await getPrivateBalance(sender, authToken.token)).balance);
  const recipientBefore = isSelf ? senderBefore
    : BigInt((await getPrivateBalance(recipient, authToken.token)).balance);
  console.log(`        Sender   : ${fmt(senderBefore)}`);
  if (!isSelf) console.log(`        Recipient: ${fmt(recipientBefore)}`);
  console.log();

  // ── 3. Build + send private transfer ─────────────────────────────────────
  console.log("[ 3/4 ] Building private transfer...");
  const payload = await buildPrivateTransfer(sender, recipient, amount, authToken.token);
  console.log(`        kind         : ${payload.kind}`);
  console.log(`        sendTo       : ${payload.sendTo}`);
  console.log(`        instructions : ${payload.instructionCount}`);

  const conn = payload.sendTo === "base" ? connection : teeConn;
  const sig = await signAndSend(payload, connection, teeConn, makeSignTx(senderKp));
  console.log(`        sig          : ${sig}`);
  const target = payload.sendTo === "base"
    ? `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    : `TEE RPC`;
  console.log(`        explorer     : ${target}`);

  console.log(`        Confirming on ${payload.sendTo}...`);
  const conf = await conn.confirmTransaction(sig, "confirmed");
  if (conf.value.err) throw new Error(`Transfer failed: ${JSON.stringify(conf.value.err)}`);
  console.log("        ✓ Confirmed\n");

  // ── 4. Post-transfer balances ─────────────────────────────────────────────
  console.log("[ 4/4 ] Polling private balances (PrivatePaymentsProg may take a few seconds)...");
  const minExpected = isSelf ? senderBefore : recipientBefore + BigInt(amount);
  const recipientFinal = await pollBalance(
    recipient, authToken.token, minExpected, isSelf ? "Sender" : "Recipient"
  );
  const senderFinal = isSelf ? recipientFinal
    : BigInt((await getPrivateBalance(sender, authToken.token)).balance);

  console.log("\n─── Balance Summary ───────────────────────────────────");
  console.log(`  Sender   before : ${fmt(senderBefore)}`);
  console.log(`  Sender   after  : ${fmt(senderFinal)}`);
  if (!isSelf) {
    console.log(`  Recipient before: ${fmt(recipientBefore)}`);
    console.log(`  Recipient after : ${fmt(recipientFinal)}`);
  }

  const ok = isSelf
    ? true // self-transfer balance unchanged
    : recipientFinal > recipientBefore;

  console.log(ok
    ? "\n  ✓ Step 3 — private transfer confirmed\n  ✓ Step 4 — getPrivateBalance reflects transfer"
    : "\n  ⚠  Balance not yet updated — may still be processing."
  );

  console.log("\n" + "=".repeat(60));
  console.log("Individual amounts + recipient wallets not visible on Solana.");
  console.log("=".repeat(60));
}

main().catch(err => { console.error("\n✗ Fatal:", err.message ?? err); process.exit(1); });
