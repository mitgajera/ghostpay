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
        "gp-green-bg":  "#e8f5ee",
        "gp-surface":   "#111111",
        "gp-surface-2": "#161616",
        "gp-border":    "#1e1e1e",
        "gp-border-2":  "#2a2a2a",
      },
      fontFamily: {
        mono:    ["var(--font-dm-mono)", "DM Mono", "monospace"],
        display: ["var(--font-syne)",    "Syne",    "sans-serif"],
      },
    },
  },
  plugins: [],
};
