"use client";

import { useTheme, type ThemeSetting } from "@/context/ThemeContext";

const NEXT: Record<ThemeSetting, ThemeSetting> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemeSetting, string> = { light: "فاتح", dark: "داكن", system: "حسب الجهاز" };

/** Cycles system → light → dark. The label names the current mode and the next one. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next = NEXT[theme];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`المظهر: ${LABEL[theme]}. اضغط للتبديل إلى ${LABEL[next]}`}
      title={`المظهر: ${LABEL[theme]}`}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "light" && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
        {theme === "dark" && <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
        {theme === "system" && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          </>
        )}
      </svg>
    </button>
  );
}
