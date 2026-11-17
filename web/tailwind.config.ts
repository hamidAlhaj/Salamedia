import type { Config } from "tailwindcss";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

// Semantic colours only (CLAUDE.md §4.10). Components never use raw palette colours.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        border: token("border"),
        text: token("text"),
        muted: token("muted"),
        primary: token("primary"),
        "primary-fg": token("primary-fg"),
        "primary-soft": token("primary-soft"),
        accent: token("accent"),
        "accent-fg": token("accent-fg"),
        danger: token("danger"),
        success: token("success"),
        ring: token("ring"),
        overlay: token("overlay"),
        "overlay-fg": token("overlay-fg"),
      },
      keyframes: {
        "menu-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "menu-in": "menu-in 140ms ease-out",
      },
      fontFamily: {
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
