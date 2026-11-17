import type { Metadata } from "next";
import Link from "next/link";
import { PeopleIcon, SearchIcon } from "@/components/layout/nav";
import { PageColumn } from "@/components/layout/SideColumns";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError, apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { requireSessionToken } from "@/lib/session";
import type { PublicUser } from "@/lib/types";

export const metadata: Metadata = { title: "المتابَعون" };

// Placeholder until Phase 7 (following / followers / suggestions). The header search
// (`/following?q=`) already works: it calls GET /users/search.
export default async function FollowingPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const token = await requireSessionToken();
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  let results: PublicUser[] | null = null;
  let error: string | null = null;
  if (q) {
    try {
      results = await apiFetch<PublicUser[]>(`/users/search?q=${encodeURIComponent(q)}`, { token });
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      error = errorMessage(err.code);
    }
  }

  return (
    <PageColumn>
      <Card flush className="flex flex-col gap-4">
        <form action="/following" role="search" className="relative">
          <label htmlFor="people-search" className="sr-only">
            ابحث عن أشخاص
          </label>
          <SearchIcon size={18} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted" />
          <input
            id="people-search"
            name="q"
            type="search"
            required
            maxLength={50}
            defaultValue={q}
            placeholder="ابحث بالاسم أو اسم المستخدم"
            className="h-11 w-full rounded-full bg-surface-2 pe-4 ps-10 text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {results === null && !error && (
          <EmptyState
            icon={<PeopleIcon size={28} />}
            title="المتابَعون"
            description="هنا ستجد من تتابعهم ومن يتابعونك واقتراحات لأشخاص من سلمية."
          />
        )}

        {results?.length === 0 && (
          <EmptyState icon={<SearchIcon size={28} />} title="لا نتائج" description={`لم نجد أحداً يطابق «${q}».`} />
        )}

        {results && results.length > 0 && (
          <ul className="flex flex-col" aria-label="نتائج البحث">
            {results.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/u/${u.username}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar name={u.name} userId={u.id} src={u.avatarUrl} />
                  <span className="flex min-w-0 flex-col leading-6">
                    <span className="truncate font-semibold">{u.name}</span>
                    <span className="truncate text-sm text-muted">
                      <span dir="ltr">{`@${u.username}`}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageColumn>
  );
}
