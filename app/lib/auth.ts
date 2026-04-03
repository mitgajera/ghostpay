import {
  verifyTeeRpcIntegrity,
  getAuthToken,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { PublicKey } from "@solana/web3.js";
import { TEE_RPC_URL } from "../constants";

export interface AuthToken {
  token: string;
  expiresAt: number; // unix ms
}

/**
 * Verify the TEE RPC is running on genuine Intel TDX hardware.
 * Call once on app load. Show error UI if false.
 */
export async function verifyTee(): Promise<boolean> {
  return verifyTeeRpcIntegrity(TEE_RPC_URL);
}

/**
 * Get an authorization token for a wallet.
 * signMessage: wallet adapter's signMessage function.
 * Cache result in React state — don't call on every txn.
 */
export async function fetchAuthToken(
  publicKey: PublicKey,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
): Promise<AuthToken> {
  const result = await getAuthToken(
    TEE_RPC_URL,
    publicKey,
    (message: Uint8Array) => signMessage(message)
  );
  return {
    token: result.token,
    expiresAt: Date.now() + 55 * 60 * 1000, // treat as 55min expiry
  };
}

/**
 * Build the authenticated TEE RPC URL by appending the auth token.
 */
export function teeUrl(token: string): string {
  return `${TEE_RPC_URL}?token=${token}`;
}
