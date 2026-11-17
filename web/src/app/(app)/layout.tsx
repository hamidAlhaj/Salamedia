import { BottomTabs } from "@/components/layout/BottomTabs";
import { Header } from "@/components/layout/Header";
import { fetchMe } from "@/lib/api";
import { requireSessionToken } from "@/lib/session";
import type { CurrentUser } from "@/lib/types";
import { StoreProvider } from "@/store/StoreProvider";

/**
 * Protected frame. No cookie → /login. /auth/me is fetched once per request; a 401 or a
 * 403 ACCOUNT_SUSPENDED makes apiFetch redirect to /auth/end-session, which clears the cookie
 * (not possible while rendering) and lands on /login or /login?suspended=1.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = await requireSessionToken();
  const me = await fetchMe(token);
  const user: CurrentUser = {
    id: me.id,
    name: me.name,
    username: me.username,
    email: me.email,
    avatarUrl: me.avatarUrl,
    role: me.role,
  };

  return (
    <StoreProvider user={user}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
      >
        تخطَّ إلى المحتوى
      </a>
      <Header />
      <main
        id="main"
        className="min-h-[calc(100dvh-3.5rem)] px-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pt-4 md:pb-8"
      >
        {children}
      </main>
      <BottomTabs />
    </StoreProvider>
  );
}
