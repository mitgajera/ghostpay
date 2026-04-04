/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "gp-black":     "#0a0a0a",
        "gp-white":     "#fafaf8",
        "gp-ghost":     "#e8e6e1",
        "gp-ghost-2":   "#d0cdc6",
        "gp-ghost-dim": "#b8b5ae",
        "gp-green":     "#1a7a4a",
        "gp-green-2":   "#155f39",
        "gp-green-bg":  "#e8f5ee",
        "gp-surface":   "#0f0f0f",
        "gp-surface-2": "#141414",
        "gp-border":    "#1a1a1a",
        "gp-border-2":  "#252525",
        "gp-border-3":  "#2d2d2d",
      },
      fontFamily: {
        mono:    ["var(--font-dm-mono)", "DM Mono", "monospace"],
        display: ["var(--font-syne)",    "Syne",    "sans-serif"],
      },
      animation: {
        "pulse-dot":   "pulse-dot 2.4s ease-in-out infinite",
        "fade-in":     "fade-in 0.4s ease-out both",
        "slide-up":    "slide-up 0.4s ease-out both",
        "ticker":      "ticker-scroll 50s linear infinite",
        "ticker-fast": "ticker-scroll 28s linear infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1",   transform: "scale(1)" },
          "50%":      { opacity: "0.4", transform: "scale(0.75)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "ticker-scroll": {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
