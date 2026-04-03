import type { AppProps } from "next/app";
import { useEffect, useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import "@solana/wallet-adapter-react-ui/styles.css";
import "../styles/globals.css";

const DEVNET_RPC = "https://rpc.magicblock.app/devnet";

// Wallet adapter types lag behind React 18 — cast to any to avoid JSX assignability errors
const CP = ConnectionProvider as any;
const WP = WalletProvider as any;
const WMP = WalletModalProvider as any;

export default function App({ Component, pageProps }: AppProps) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <CP endpoint={DEVNET_RPC}>
      <WP wallets={wallets} autoConnect>
        <WMP>
          <Component {...pageProps} />
        </WMP>
      </WP>
    </CP>
  );
}
