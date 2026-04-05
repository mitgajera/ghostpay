/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow external image CDNs used by CoinImg, FlagImg, Footer
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },

  // Security + performance headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options",        value: "DENY"    },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
