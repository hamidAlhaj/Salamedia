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
        // The like "pop" (off under prefers-reduced-motion: motion-reduce:animate-none + globals.css).
        "like-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
        // CSS-only toast: fades in, stays, fades out. Removed from the DOM when it ends.
        toast: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "12%, 85%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(0)" },
        },
      },
      animation: {
        "menu-in": "menu-in 140ms ease-out",
        "like-pop": "like-pop 320ms ease-out",
        toast: "toast 2400ms ease-out forwards",
      },
      fontFamily: {
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
