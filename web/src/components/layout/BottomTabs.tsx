"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { sections } from "./nav";

/**
 * Phone navigation (< md): a fixed bottom bar with the 5 tabs, icons + small labels, padded for
 * the home indicator. On /reels it turns into dark glass over the video (data-variant="overlay").
 * The (app) layout pads the content by the same height so nothing hides behind it.
 */
export function BottomTabs() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.currentUser);
  if (!user) return null;
  const overlay = pathname.startsWith("/reels");

  return (
    <nav
      aria-label="الأقسام"
      data-variant={overlay ? "overlay" : "default"}
      className={`fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden ${
        overlay ? "bg-overlay/70 text-overlay-fg backdrop-blur-md" : "border-t border-border bg-surface"
      }`}
    >
      <ul className="grid h-14 grid-cols-5">
        {sections(user.username).map(({ key, label, href, Icon, isActive }) => {
          const active = isActive(pathname);
          const tone = active ? (overlay ? "text-overlay-fg" : "text-primary") : overlay ? "text-overlay-fg/70" : "text-muted";
          return (
            <li key={key} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium leading-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${tone}`}
              >
                <Icon size={24} className={active ? "stroke-[2.4]" : ""} />
                <span className={active ? "font-semibold" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
