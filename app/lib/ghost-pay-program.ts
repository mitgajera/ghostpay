/**
 * ghost-pay-program.ts — Optional Anchor program client
 *
 * Records a public, privacy-preserving payroll receipt on Solana devnet.
 * Stores: who ran payroll (employer), how many recipients, total USDC.
 * Does NOT store individual amounts or recipient wallets — those are
 * handled privately inside the MagicBlock TEE.
 *
 * Usage:
 *   const batchId = Date.now();
 *   await initializeBatch(batchId, recipients.length, totalUsdc, wallet, connection);
 *   // ... run private transfers via per-api.ts ...
 *   await finalizeBatch(batchId, wallet, connection);
 *
 * Deploy:
 *   anchor build && anchor deploy --provider.cluster devnet
 *   Then replace GHOST_PAY_PROGRAM_ID below with the deployed address.
 */

import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { GHOST_PAY_SEED } from "../constants";

// Replace with deployed program ID after `anchor deploy`
export const GHOST_PAY_PROGRAM_ID = new PublicKey("GPAYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

export function getBatchPda(employer: PublicKey, batchId: bigint): [PublicKey, number] {
  const batchIdBuf = Buffer.alloc(8);
  batchIdBuf.writeBigUInt64LE(batchId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("batch"), employer.toBuffer(), batchIdBuf],
    GHOST_PAY_PROGRAM_ID
  );
}

/**
 * Build the initialize_batch instruction.
 * Call before running payroll to record the public receipt.
 */
export async function buildInitializeBatch(
  employer: PublicKey,
  batchId: number,
  numRecipients: number,
  totalUsdc: number, // lamports
  connection: Connection
): Promise<Transaction> {
  const batchIdBig = BigInt(batchId);
  const [batchPda] = getBatchPda(employer, batchIdBig);

  // Instruction discriminator for initialize_batch (first 8 bytes of sha256("global:initialize_batch"))
  const discriminator = Buffer.from([210, 237, 56, 188, 44, 25, 168, 175]);

  const batchIdBuf = Buffer.alloc(8);
  batchIdBuf.writeBigUInt64LE(batchIdBig);

  const numRecipientsBuf = Buffer.alloc(1);
  numRecipientsBuf.writeUInt8(numRecipients);

  const totalUsdcBuf = Buffer.alloc(8);
  totalUsdcBuf.writeBigUInt64LE(BigInt(totalUsdc));

  const data = Buffer.concat([discriminator, batchIdBuf, numRecipientsBuf, totalUsdcBuf]);

  const ix = new TransactionInstruction({
    programId: GHOST_PAY_PROGRAM_ID,
    keys: [
      { pubkey: batchPda, isSigner: false, isWritable: true },
      { pubkey: employer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = employer;
  return tx;
}

/**
 * Build the finalize_batch instruction.
 * Call after all private transfers complete.
 */
export async function buildFinalizeBatch(
  employer: PublicKey,
  batchId: number,
  connection: Connection
): Promise<Transaction> {
  const batchIdBig = BigInt(batchId);
  const [batchPda] = getBatchPda(employer, batchIdBig);

  // Discriminator for finalize_batch
  const discriminator = Buffer.from([100, 14, 205, 95, 230, 66, 49, 92]);

  const data = Buffer.concat([discriminator]);

  const ix = new TransactionInstruction({
    programId: GHOST_PAY_PROGRAM_ID,
    keys: [
      { pubkey: batchPda, isSigner: false, isWritable: true },
      { pubkey: employer, isSigner: true, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = employer;
  return tx;
}
