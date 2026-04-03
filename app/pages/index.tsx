import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { APP_TAGLINE } from "../constants";

export default function Home() {
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (publicKey) router.push("/employer");
  }, [publicKey, router]);

  return (
    <main className="min-h-screen bg-gp-black flex flex-col items-center justify-center px-6 relative">
      {/* Logo */}
      <h1 className="font-display font-bold text-[clamp(4rem,12vw,8rem)] tracking-tight text-gp-white leading-none mb-5 select-none">
        Ghost<span style={{ opacity: 0.35 }}>Pay</span>
      </h1>

      {/* Tagline */}
      <p className="font-mono text-sm text-gp-ghost-dim mb-12 tracking-wide">
        {APP_TAGLINE}
      </p>

      {/* Connect CTA */}
      <WalletMultiButton />

      {/* Nav links */}
      <div className="flex gap-8 mt-14 font-mono text-xs text-gp-ghost-dim">
        <button
          onClick={() => router.push("/employer")}
          className="hover:text-gp-white transition-colors"
        >
          Employer →
        </button>
        <button
          onClick={() => router.push("/employee")}
          className="hover:text-gp-white transition-colors"
        >
          Employee →
        </button>
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 font-mono text-[10px] text-gp-border-2 tracking-widest uppercase">
        Solana devnet · MagicBlock TEE · Intel TDX
      </p>
    </main>
  );
}
