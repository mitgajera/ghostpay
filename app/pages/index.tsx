import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (publicKey) router.push("/employer");
  }, [publicKey, router]);

  return (
    <main className="min-h-screen bg-gp-black flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,122,74,0.05) 0%, transparent 100%)" }}
      />

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-7 animate-fade-in">

        {/* Logo */}
        <h1
          className="font-display font-extrabold tracking-[-0.025em] text-gp-white leading-none select-none"
          style={{ fontSize: "clamp(72px, 16vw, 148px)" }}
        >
          Ghost<span style={{ opacity: 0.28 }}>Pay</span>
        </h1>

        {/* Tagline */}
        <p className="font-mono text-xs tracking-[0.28em] text-gp-ghost-dim uppercase">
          Pay your team · Leave no trace
        </p>

        {/* CTA */}
        <div className="mt-3">
          <WalletMultiButton />
        </div>

        {/* Role nav */}
        <div className="flex items-center gap-7 mt-6 font-mono text-[11px] text-gp-border-3">
          <button
            onClick={() => router.push("/employer")}
            className="hover:text-gp-ghost-dim transition-colors duration-150"
          >
            Employer →
          </button>
          <span className="text-gp-border-2 select-none">·</span>
          <button
            onClick={() => router.push("/employee")}
            className="hover:text-gp-ghost-dim transition-colors duration-150"
          >
            Employee →
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 font-mono text-[9px] tracking-[0.22em] text-gp-border-2 uppercase select-none">
        Intel TDX &nbsp;·&nbsp; Solana devnet &nbsp;·&nbsp; MagicBlock TEE
      </p>
    </main>
  );
}
