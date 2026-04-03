import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { APP_NAME, APP_TAGLINE } from "../constants";

export default function Home() {
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (publicKey) router.push("/employer");
  }, [publicKey, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-2">{APP_NAME}</h1>
        <p className="text-xl text-gray-400">{APP_TAGLINE}</p>
      </div>

      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <p className="text-gray-500 text-sm">
          Cross-currency private payroll on Solana. Powered by MagicBlock Private Ephemeral Rollup + Intel TDX.
        </p>
        <WalletMultiButton />
        <div className="flex gap-6 mt-4">
          <a href="/employer" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
            Employer →
          </a>
          <a href="/employee" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
            Employee →
          </a>
        </div>
      </div>
    </main>
  );
}
