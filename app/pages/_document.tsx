import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ── Favicon ──────────────────────────────────────────────── */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />

        {/* ── Meta ─────────────────────────────────────────────────── */}
        <meta name="description" content="Private batch payroll on Solana — Intel TDX TEE, 5 stablecoins, 18 currencies." />
        <meta name="theme-color" content="#0a0a0a" />

        {/* ── Open Graph ───────────────────────────────────────────── */}
        <meta property="og:site_name" content="GhostPay" />
        <meta property="og:type"      content="website" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
