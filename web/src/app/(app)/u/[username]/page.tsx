import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ReelsIcon, SettingsIcon } from "@/components/layout/nav";
import { PageColumn } from "@/components/layout/SideColumns";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import { requireSessionToken } from "@/lib/session";
import type { ProfileUser } from "@/lib/types";

type Params = Promise<{ username: string }>;

/** One request per render, shared by generateMetadata and the page. 404 → null. */
const getProfile = cache(async (username: string): Promise<ProfileUser | null> => {
  const token = await requireSessionToken();
  return apiFetch<ProfileUser>(`/users/${encodeURIComponent(username)}`, { token }).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const profile = await getProfile((await params).username);
  return { title: profile ? `${profile.name} (@${profile.username})` : "الحساب غير موجود" };
}

// The real profile header now; the posts / reels grids arrive in Phase 11.
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await getProfile((await params).username);
  if (!profile) notFound();
  const tab = (await searchParams).tab === "reels" ? "reels" : "posts";

  const counts = [
    { label: "منشور", value: profile.postsCount },
    { label: "ريل", value: profile.reelsCount },
    { label: "متابِع", value: profile.followersCount },
    { label: "يتابع", value: profile.followingCount },
  ];

  return (
    <PageColumn>
      <div className="flex flex-col gap-2 sm:gap-4">
        <Card flush className="flex flex-col items-center gap-4 pt-6 text-center sm:flex-row sm:items-end sm:text-start">
          <Avatar name={profile.name} userId={profile.id} src={profile.avatarUrl} size="xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-[15px] text-muted">
              <span dir="ltr">{`@${profile.username}`}</span>
            </p>
            {profile.bio && <p className="mt-1 whitespace-pre-line text-[15px]">{profile.bio}</p>}
            <p className="text-sm text-muted">انضم في {formatDate(profile.createdAt)}</p>
          </div>
          {profile.isMe && (
            <Link href="/settings/profile" className={buttonClasses({ variant: "secondary" })}>
              <SettingsIcon size={18} />
              تعديل الملف الشخصي
            </Link>
          )}
        </Card>

        <dl className="grid grid-cols-4 gap-px overflow-hidden bg-border sm:gap-2 sm:rounded-lg sm:bg-transparent">
          {counts.map((c) => (
            <div key={c.label} className="flex flex-col-reverse items-center bg-surface px-1 py-3 shadow-sm sm:rounded-lg">
              <dt className="text-sm text-muted">{c.label}</dt>
              <dd className="text-xl font-bold leading-tight">{formatNumber(c.value)}</dd>
            </div>
          ))}
        </dl>

        <Card flush padded={false}>
          <div className="px-2">
            <Tabs
              label="محتوى الحساب"
              basePath={`/u/${profile.username}`}
              active={tab}
              items={[
                { key: "posts", label: "المنشورات", count: profile.postsCount },
                { key: "reels", label: "الريلز", count: profile.reelsCount },
              ]}
            />
          </div>
          <EmptyState
            icon={<ReelsIcon size={28} />}
            title={tab === "posts" ? "المنشورات" : "الريلز"}
            description={
              tab === "posts"
                ? "ستظهر هنا شبكة المنشورات قريباً."
                : "ستظهر هنا شبكة الريلز قريباً."
            }
          />
        </Card>
      </div>
    </PageColumn>
  );
}
