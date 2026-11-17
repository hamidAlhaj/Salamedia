import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PostCardView } from "@/components/posts/PostCard";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ApiError, apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import type { PostCard } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/** GET /posts/:id/public (no token): visible posts by active authors, else null. */
const getPublicPost = cache(async (id: string): Promise<PostCard | null> => {
  if (!/^[1-9]\d{0,9}$/.test(id)) return null;
  try {
    return await apiFetch<PostCard>(`/posts/${id}/public`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
});

/** The origin the visitor used (localhost or the LAN IP), so og:url and og:image are absolute. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function excerpt(text: string, max = 100): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(flat); // do not split an emoji
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : flat;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPost(id);
  if (!post) return { title: "منشور غير موجود", robots: { index: false } };

  const origin = await requestOrigin();
  const text = post.body?.trim() || post.repostOf?.body?.trim() || "";
  const title = `${post.author.name} على سلاميديا`;
  const description = text ? excerpt(text) : `منشور من ${post.author.name} على سلاميديا`;
  const image = [...post.media, ...(post.repostOf?.media ?? [])].find((m) => m.kind === "IMAGE");

  return {
    metadataBase: new URL(origin),
    title: `منشور ${post.author.name}`,
    description,
    openGraph: {
      type: "article",
      siteName: "سلاميديا",
      locale: "ar_SY",
      url: `${origin}/p/${post.id}`,
      title,
      description,
      publishedTime: post.createdAt,
      authors: [post.author.name],
      images: image
        ? [{ url: `${origin}${image.url}`, width: image.width ?? undefined, height: image.height ?? undefined, alt: description }]
        : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

/** Public, read-only share page (outside the app frame). Visible posts by active authors only. */
export default async function PublicPostPage({ params }: Params) {
  const { id } = await params;
  const [post, token] = await Promise.all([getPublicPost(id), getSessionToken()]);
  if (!post) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 h-14 bg-surface shadow-sm">
        <div className="mx-auto flex h-full max-w-[680px] items-center justify-between gap-2 px-3">
          <Link
            href="/"
            className="rounded-lg px-1 text-2xl font-bold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            سلاميديا
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!token && (
              <Link href="/login" className={buttonClasses({ size: "sm" })}>
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[680px] flex-1 pb-10 pt-2 sm:px-4 sm:pt-4">
        <h1 className="sr-only">منشور {post.author.name} على سلاميديا</h1>
        <PostCardView post={post} linkBase="/p" readOnly />
        <Card flush className="mt-2 flex flex-col items-center gap-3 text-center sm:mt-4">
          {token ? (
            <>
              <p className="text-[15px] text-muted">أنت مسجّل الدخول. افتح المنشور في سلاميديا لتتفاعل معه.</p>
              <Link href={`/posts/${post.id}`} className={buttonClasses()}>
                افتح المنشور في سلاميديا
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">سجّل الدخول للتفاعل</h2>
              <p className="max-w-sm text-[15px] text-muted">
                سجّل الدخول أو أنشئ حساباً لتعجب بالمنشور وتعلّق عليه وتتابع {post.author.name}.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/login" className={buttonClasses()}>
                  تسجيل الدخول
                </Link>
                <Link href="/register" className={buttonClasses({ variant: "secondary" })}>
                  إنشاء حساب جديد
                </Link>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
