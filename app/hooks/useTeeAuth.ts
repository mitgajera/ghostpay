import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchAuthToken, verifyTee, AuthToken } from "../lib/auth";

export function useTeeAuth() {
  const { publicKey, signMessage } = useWallet();
  const [authToken, setAuthToken]   = useState<AuthToken | null>(null);
  const [teeVerified, setTeeVerified] = useState<boolean | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const isExpired = authToken ? Date.now() > authToken.expiresAt : true;

  const authorize = useCallback(async () => {
    if (!publicKey || !signMessage) return;
    setLoading(true);
    setError(null);
    try {
      const verified = await verifyTee();
      setTeeVerified(verified);
      if (!verified) throw new Error("TEE integrity check failed");
      const token = await fetchAuthToken(publicKey, signMessage);
      setAuthToken(token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage]);

  const getValidToken = useCallback(async (): Promise<string> => {
    if (authToken && !isExpired) return authToken.token;
    await authorize();
    if (!authToken) throw new Error("Could not obtain auth token");
    return authToken.token;
  }, [authToken, isExpired, authorize]);

  return { authToken, teeVerified, loading, error, authorize, getValidToken, isExpired };
}
