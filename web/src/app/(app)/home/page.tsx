import type { Metadata } from "next";
import Link from "next/link";
import { PeopleIcon } from "@/components/layout/nav";
import { SideColumns } from "@/components/layout/SideColumns";
import { Composer } from "@/components/posts/Composer";
import { LoadMoreFeed } from "@/components/posts/LoadMoreFeed";
import { PostCardView } from "@/components/posts/PostCard";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/api";
import { requireSessionToken } from "@/lib/session";
import type { Page, PostCard } from "@/lib/types";

export const metadata: Metadata = { title: "الرئيسية" };

/** Composer + the Home feed (people I follow + me, newest first). The first page is server-rendered. */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ compose?: string }> }) {
  const token = await requireSessionToken();
  const [{ compose }, feed] = await Promise.all([
    searchParams,
    apiFetch<Page<PostCard>>("/feed/home?limit=10", { token }),
  ]);

  return (
    <SideColumns>
      <h1 className="sr-only">الرئيسية</h1>
      <Composer autoOpen={compose === "1"} />
      {feed.items.length === 0 ? (
        <Card flush>
          <EmptyState
            icon={<PeopleIcon size={28} />}
            title="تابع أشخاصاً لترى منشوراتهم"
            description="هنا تظهر منشورات من تتابعهم ومنشوراتك، الأحدث أولاً."
            action={
              <Link href="/following?tab=suggestions" className={buttonClasses()}>
                اقتراحات للمتابعة
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-4">
          {feed.items.map((post) => (
            <PostCardView key={post.id} post={post} />
          ))}
          <LoadMoreFeed key={feed.items[0].id} initialCursor={feed.nextCursor} />
        </div>
      )}
    </SideColumns>
  );
}
