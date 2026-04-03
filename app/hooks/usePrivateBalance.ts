import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getPrivateBalance } from "../lib/per-api";

export function usePrivateBalance(authToken: string | null, pollIntervalMs = 10_000) {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey || !authToken) return;
    setLoading(true);
    try {
      const res = await getPrivateBalance(publicKey.toBase58(), authToken);
      setBalance(Number(res.balance));
    } catch {
      // silently ignore polling errors
    } finally {
      setLoading(false);
    }
  }, [publicKey, authToken]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(id);
  }, [refresh, pollIntervalMs]);

  return { balance, loading, refresh };
}
