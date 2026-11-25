import type { Config } from "tailwindcss";

// Tokens mirror docs/design-system/ (guideline FE-13). Components must not use hex literals.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        paper: "#FAF8F3",
        well: "#E4E1D9",
        concrete: {
          100: "#ECEAE4",
          200: "#DAD7CF",
          300: "#C2BFB6",
          500: "#8A8780",
          700: "#4A4944",
        },
        signal: { 300: "#FF9A6E", 500: "#FF5A1F", 600: "#E04407" },
        tag: "#FFD83D",
        success: "#1F8A4C",
        danger: "#C21F3A",
      },
      fontFamily: {
        display: ["var(--font-archivo)", "Arial Black", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
      borderWidth: { 3: "3px" },
      boxShadow: {
        hard: "4px 4px 0 #111111",
        "hard-sm": "2px 2px 0 #111111",
        "hard-lg": "8px 8px 0 #111111",
        key: "inset 0 2px 0 rgba(255,255,255,.55), inset 0 -4px 0 rgba(0,0,0,.18), 4px 4px 0 #111111",
        pressed: "inset 0 3px 0 rgba(0,0,0,.25), 1px 1px 0 #111111",
        well: "inset 0 3px 0 rgba(0,0,0,.18), inset 0 -1px 0 #ffffff",
      },
      backgroundImage: {
        key: "linear-gradient(180deg, #FF7A47, #FF5A1F 58%, #E94A10)",
      },
      transitionDuration: { 120: "120ms" },
    },
  },
  plugins: [],
};
export default config;
