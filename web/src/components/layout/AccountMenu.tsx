"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logout } from "@/lib/actions/auth";
import type { CurrentUser } from "@/lib/types";
import { LogoutIcon, SettingsIcon, ShieldIcon, UserIcon } from "./nav";

const ITEM =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-[15px] font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ITEM_ICON = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2";

/**
 * The avatar button and its dropdown (a disclosure: the button toggles a panel of plain links and
 * buttons, so Tab / Shift+Tab move through it). Closes on Escape (focus returns to the button),
 * on a click outside, when focus leaves it, and after navigating.
 */
export function AccountMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        if (open && e.relatedTarget && !rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`حسابي: ${user.name}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <Avatar name={user.name} userId={user.id} src={user.avatarUrl} size="md" />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute end-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top animate-menu-in rounded-lg bg-surface p-2 shadow-lg motion-reduce:animate-none"
        >
          <Link href={`/u/${user.username}`} className={`${ITEM} mb-1`}>
            <Avatar name={user.name} userId={user.id} src={user.avatarUrl} size="md" />
            <span className="flex min-w-0 flex-col leading-6">
              <span className="truncate font-semibold">{user.name}</span>
              <span dir="ltr" className="truncate text-end text-sm font-normal text-muted">
                {`@${user.username}`}
              </span>
            </span>
          </Link>
          <hr className="mx-2 my-1 border-border" />

          <Link href={`/u/${user.username}`} className={ITEM}>
            <span className={ITEM_ICON}>
              <UserIcon size={20} />
            </span>
            ملفي الشخصي
          </Link>
          <Link href="/settings/profile" className={ITEM}>
            <span className={ITEM_ICON}>
              <SettingsIcon size={20} />
            </span>
            الإعدادات
          </Link>
          {user.role === "ADMIN" && (
            <Link href="/admin" className={ITEM}>
              <span className={ITEM_ICON}>
                <ShieldIcon size={20} />
              </span>
              لوحة الإدارة
            </Link>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5">
            <span className="text-[15px] font-medium text-text">المظهر</span>
            <ThemeToggle className="bg-surface-2" />
          </div>

          <hr className="mx-2 my-1 border-border" />
          <form action={logout}>
            <button type="submit" className={ITEM}>
              <span className={ITEM_ICON}>
                <LogoutIcon size={20} />
              </span>
              تسجيل الخروج
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
