import type { AppProps } from "next/app";
import { useEffect, useMemo, useState } from "react";
import { DM_Mono, Syne } from "next/font/google";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import "@solana/wallet-adapter-react-ui/styles.css";
import "../styles/globals.css";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const DEVNET_RPC = "https://rpc.magicblock.app/devnet";

const CP  = ConnectionProvider  as any;
const WP  = WalletProvider      as any;
const WMP = WalletModalProvider as any;

export default function App({ Component, pageProps }: AppProps) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className={`${dmMono.variable} ${syne.variable} font-mono bg-gp-black min-h-screen`}>
      <CP endpoint={DEVNET_RPC}>
        <WP wallets={wallets} autoConnect>
          <WMP>
            <Component {...pageProps} />
          </WMP>
        </WP>
      </CP>
    </div>
  );
}
