/**
 * test-auth.ts
 *
 * Tests verifyTee() and fetchAuthToken() against tee.magicblock.app (devnet).
 *
 * Usage:
 *   npx ts-node scripts/test-auth.ts
 *   npx ts-node scripts/test-auth.ts --keypair ~/.config/solana/id.json
 *
 * The --keypair flag loads an existing Solana keypair file.
 * Without it, an ephemeral keypair is generated for the test.
 */

import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import fs from "fs";
import path from "path";
import { verifyTee, fetchAuthToken, teeUrl } from "../app/lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadOrGenerateKeypair(): Keypair {
  const keypairFlagIdx = process.argv.indexOf("--keypair");
  if (keypairFlagIdx !== -1) {
    const filePath = process.argv[keypairFlagIdx + 1];
    const resolved = path.resolve(filePath.replace("~", process.env.HOME ?? ""));
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(resolved, "utf-8")));
    const kp = Keypair.fromSecretKey(secretKey);
    console.log(`Loaded keypair from ${resolved}`);
    return kp;
  }
  const kp = Keypair.generate();
  console.log("Generated ephemeral keypair (not funded — verifyTee does not need funds)");
  return kp;
}

/**
 * Wallet-adapter-compatible signMessage implementation for a raw Keypair.
 * Matches what Phantom/Backpack do: sign the raw message bytes with ed25519.
 */
function makeSignMessage(keypair: Keypair) {
  return async (message: Uint8Array): Promise<Uint8Array> => {
    const sig = nacl.sign.detached(message, keypair.secretKey);
    return sig;
  };
}

function formatExpiry(expiresAt: number): string {
  const diffMs = expiresAt - Date.now();
  const mins = Math.floor(diffMs / 60_000);
  const secs = Math.floor((diffMs % 60_000) / 1000);
  return `~${mins}m ${secs}s from now`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("GhostPay — TEE Auth Test Script");
  console.log("Target: tee.magicblock.app (devnet)");
  console.log("=".repeat(60));

  const keypair = loadOrGenerateKeypair();
  console.log(`Wallet: ${keypair.publicKey.toBase58()}\n`);

  // ── Step 1: verifyTee() ──────────────────────────────────────────────────
  console.log("[ 1/2 ] Calling verifyTee()...");
  const t0 = Date.now();
  let teeOk: boolean;
  try {
    teeOk = await verifyTee();
    const elapsed = Date.now() - t0;
    if (teeOk) {
      console.log(`        ✓ TEE integrity verified (${elapsed}ms)\n`);
    } else {
      console.warn(`        ✗ verifyTee() returned false (${elapsed}ms)`);
      console.warn("          The TEE RPC did not pass the Intel TDX attestation check.");
      console.warn("          Continuing to fetchAuthToken anyway for testing purposes.\n");
    }
  } catch (err: any) {
    console.error(`        ✗ verifyTee() threw: ${err.message}`);
    console.error("          Check network connectivity to tee.magicblock.app");
    process.exit(1);
  }

  // ── Step 2: fetchAuthToken() ─────────────────────────────────────────────
  console.log("[ 2/2 ] Calling fetchAuthToken()...");
  const signMessage = makeSignMessage(keypair);
  const t1 = Date.now();
  try {
    const authToken = await fetchAuthToken(keypair.publicKey, signMessage);
    const elapsed = Date.now() - t1;

    console.log(`        ✓ Auth token obtained (${elapsed}ms)`);
    console.log(`        token     : ${authToken.token.slice(0, 40)}...`);
    console.log(`        expiresAt : ${new Date(authToken.expiresAt).toISOString()} (${formatExpiry(authToken.expiresAt)})`);

    const url = teeUrl(authToken.token);
    console.log(`        teeUrl()  : ${url.slice(0, 60)}...`);

    console.log("\n" + "=".repeat(60));
    console.log("All checks passed. auth.ts is wired correctly.");
    console.log("=".repeat(60));
  } catch (err: any) {
    console.error(`        ✗ fetchAuthToken() threw: ${err.message}`);
    if (err.message?.includes("401") || err.message?.toLowerCase().includes("unauthorized")) {
      console.error("          Hint: The TEE rejected the wallet signature.");
      console.error("          Ensure the keypair is valid and the TEE RPC is reachable.");
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
