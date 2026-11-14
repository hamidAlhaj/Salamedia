import type { Config } from "tailwindcss";

// Semantic colour tokens from CSS variables arrive in Phase 2 (CLAUDE.md §4.10).
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
