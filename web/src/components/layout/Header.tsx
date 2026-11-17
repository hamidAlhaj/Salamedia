"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { formatNumber } from "@/lib/format";
import { AccountMenu } from "./AccountMenu";
import { ChatIcon, ICON_BUTTON, PlusIcon, SearchIcon, sections } from "./nav";

/**
 * Facebook-style top bar (CLAUDE.md §4.10): wordmark + search on the start side, the 5 section
 * tabs as centred icons on md+, and the action buttons + account menu on the end side.
 * Below md it keeps only the wordmark, search and chat; the tabs move to BottomTabs.
 */
export function Header({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.currentUser);
  if (!user) return null;
  const tabs = sections(user.username);

  return (
    <header className="sticky top-0 z-40 h-14 bg-surface shadow-sm">
      <div className="mx-auto grid h-full max-w-[1400px] grid-cols-[1fr_auto] items-center gap-2 px-3 md:grid-cols-[1fr_auto_1fr] md:px-4">
        {/* Start: wordmark + search */}
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/home"
            className="shrink-0 rounded-lg px-1 text-2xl font-bold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            سلاميديا
          </Link>
          <form action="/following" role="search" className="hidden w-full max-w-60 lg:block">
            <label htmlFor="header-search" className="sr-only">
              ابحث عن أشخاص
            </label>
            <div className="relative">
              <SearchIcon size={18} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted" />
              <input
                id="header-search"
                name="q"
                type="search"
                required
                maxLength={50}
                placeholder="ابحث في سلاميديا"
                className="h-10 w-full rounded-full bg-surface-2 pe-3 ps-9 text-[15px] text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </form>
        </div>

        {/* Centre: the 5 section tabs (md+) */}
        <nav aria-label="الأقسام" className="hidden h-full md:block">
          <ul className="flex h-full items-stretch">
            {tabs.map(({ key, label, href, Icon, isActive }) => {
              const active = isActive(pathname);
              return (
                <li key={key} className="relative flex">
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex w-20 items-center justify-center focus-visible:outline-none lg:w-24 xl:w-28 ${
                      active ? "text-primary" : "text-muted"
                    }`}
                  >
                    <span
                      className={`flex h-12 w-full items-center justify-center rounded-lg transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring ${
                        active ? "" : "group-hover:bg-surface-2"
                      }`}
                    >
                      <Icon size={26} />
                    </span>
                    {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-primary" />}
                    {/* Tooltip label (hover / keyboard focus) */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-full z-50 mx-auto mt-1 w-max rounded-lg bg-text px-2.5 py-1 text-xs font-medium text-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* End: actions + account */}
        <div className="flex items-center justify-end gap-2">
          <Link href="/following" aria-label="بحث" className={`${ICON_BUTTON} lg:hidden`}>
            <SearchIcon size={20} />
          </Link>
          <Link href="/home?compose=1" aria-label="منشور جديد" title="منشور جديد" className={`${ICON_BUTTON} hidden md:inline-flex`}>
            <PlusIcon size={20} />
          </Link>
          <Link
            href="/chat"
            aria-label={unreadCount > 0 ? `الدردشة، ${formatNumber(unreadCount)} غير مقروءة` : "الدردشة"}
            title="الدردشة"
            className={ICON_BUTTON}
          >
            <ChatIcon size={20} />
            {unreadCount > 0 && (
              <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] font-bold leading-5 text-accent-fg">
                {unreadCount > 99 ? "+٩٩" : formatNumber(unreadCount)}
              </span>
            )}
          </Link>
          <div className="hidden md:block">
            <AccountMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
