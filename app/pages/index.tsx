import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const STABLES: { sym: string; color: string }[] = [
  { sym: "USDC",  color: "#2775ca" },
  { sym: "USDT",  color: "#26a17b" },
  { sym: "PYUSD", color: "#0070ba" },
  { sym: "EURC",  color: "#1da1f2" },
  { sym: "USDG",  color: "#f5a623" },
];

const SPECS = [
  { k: "Network",     v: "Solana Devnet"  },
  { k: "Privacy",     v: "Intel TDX TEE"  },
  { k: "Stablecoins", v: "5 supported"    },
  { k: "Fiat FX",     v: "18 currencies"  },
  { k: "On-chain",    v: "0 traces"       },
];

export default function Home() {
  const { publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (publicKey) router.push("/employer");
  }, [publicKey, router]);

  return (
    <main className="flex-1 min-h-0 bg-gp-black relative overflow-hidden flex flex-col select-none">

      {/* ── Green left-edge glow ─────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 40% 80% at 0% 50%, rgba(26,122,74,0.11) 0%, transparent 70%)",
        }}
      />

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-gp-border shrink-0 flex items-center justify-between px-6 sm:px-10" style={{ height: "44px" }}>
        <div className="flex items-center gap-3">
          {/* GP monogram */}
          <span
            className="font-display font-black text-[15px] tracking-tight"
            style={{ color: "#fafaf8" }}
          >
            Ghost<span style={{ opacity: 0.25 }}>Pay</span>
          </span>
          <span className="hidden sm:block w-px h-3 bg-gp-border-2" />
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gp-green animate-pulse-dot" />
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-gp-border-3">Devnet</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/employer")}
            className="font-mono text-[9px] uppercase tracking-widest text-gp-border-3 hover:text-gp-ghost-dim transition-colors"
          >
            Employer
          </button>
          <button
            onClick={() => router.push("/employee")}
            className="font-mono text-[9px] uppercase tracking-widest text-gp-border-3 hover:text-gp-ghost-dim transition-colors"
          >
            Employee
          </button>
        </div>
      </header>

      {/* ── Main split ───────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_400px]">

        {/* LEFT — wordmark + descriptor */}
        <div className="flex flex-col justify-center px-8 sm:px-14 lg:px-16 py-10 lg:border-r lg:border-gp-border">

          {/* Massive stacked wordmark */}
          <div className="mb-8">
            <div
              className="font-display font-black leading-[0.85] tracking-[-0.05em]"
              style={{ fontSize: "clamp(80px, 15vw, 160px)" }}
            >
              <div
                style={{
                  color: "#fafaf8",
                  textShadow: "0 0 100px rgba(26,122,74,0.5), 0 0 40px rgba(26,122,74,0.2)",
                }}
              >
                Ghost
              </div>
              <div style={{ color: "#fafaf8", opacity: 0.20 }}>
                Pay
              </div>
            </div>
          </div>

          {/* Descriptor line */}
          <p className="font-mono text-[11px] text-gp-ghost-dim/55 leading-[1.8] mb-6 max-w-[340px]">
            Batch payroll for on-chain teams.<br />
            Amounts and recipients sealed inside<br />
            an Intel TDX trusted execution enclave.
          </p>

          {/* Stablecoin pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STABLES.map((c) => (
              <span
                key={c.sym}
                className="font-mono text-[8px] font-bold px-2 py-[4px] rounded border tracking-wider"
                style={{
                  color:       c.color,
                  borderColor: `${c.color}28`,
                  background:  `${c.color}0b`,
                }}
              >
                {c.sym}
              </span>
            ))}
            <span className="font-mono text-[8px] text-gp-border-2 pl-1.5 tracking-wider">+ 18 FIAT</span>
          </div>
        </div>

        {/* RIGHT — connect panel */}
        <div className="flex flex-col justify-center px-8 sm:px-10 lg:px-10 py-10 lg:py-0 border-t border-gp-border lg:border-t-0">

          {/* Spec table */}
          <div className="mb-8 border border-gp-border rounded-xl overflow-hidden">
            {SPECS.map((s, i) => (
              <div
                key={s.k}
                className={`flex items-center justify-between px-4 py-2.5 ${i < SPECS.length - 1 ? "border-b border-gp-border" : ""}`}
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-gp-border-3">{s.k}</span>
                <span className="font-mono text-[10px] text-gp-ghost-dim">{s.v}</span>
              </div>
            ))}
          </div>

          {/* Wallet button */}
          <div className="flex flex-col gap-2">
            <div className="wallet-landing">
              <WalletMultiButton />
            </div>
            <p className="font-mono text-[8px] text-gp-border-2 uppercase tracking-[0.16em]">
              Connect wallet to enter
            </p>
          </div>

          {/* Powered by */}
          <div className="mt-8 pt-6 border-t border-gp-border flex flex-col gap-1.5">
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-gp-border-2">Powered by</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-gp-ghost-dim/60">MagicBlock</span>
              <span className="text-gp-border-2">·</span>
              <span className="font-mono text-[10px] text-gp-ghost-dim/60">Solana</span>
              <span className="text-gp-border-2">·</span>
              <span className="font-mono text-[10px] text-gp-ghost-dim/60">Intel TDX</span>
            </div>
          </div>
        </div>

      </div>

    </main>
  );
}
