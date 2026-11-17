import Link from "next/link";
import { CommentIcon, GlobeIcon, HeartIcon, RepostIcon, ShareIcon } from "@/components/layout/nav";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatDuration, formatNumber, relativeTime } from "@/lib/format";
import type { PostCard, PostMedia, PostOriginal } from "@/lib/types";

/**
 * The one post card (CLAUDE.md §4.10, Facebook-style): header, body, edge-to-edge media, counts
 * row, divider, 3-button action row. Pure and hook-free, so it renders as a Server Component in
 * pages AND inside client components (LoadMoreFeed) from the same JSON. No second implementation.
 */
export function PostCardView({
  post,
  linkBase = "/posts",
  readOnly = false,
  footer,
}: {
  post: PostCard;
  /** Where the time and media link to: "/posts" in the app, "/p" on the public share page. */
  linkBase?: "/posts" | "/p";
  /** Public page: no action row (guests get a sign-in call to action instead). */
  readOnly?: boolean;
  /** Extra row under the actions, e.g. the delete control on /posts/[id]. */
  footer?: React.ReactNode;
}) {
  const href = `${linkBase}/${post.id}`;
  const isRepost = post.repostOf !== null || post.repostUnavailable;
  const counts = post.likeCount + post.commentCount + post.repostCount > 0;

  return (
    <article
      aria-labelledby={`post-${post.id}-author`}
      className="overflow-hidden rounded-none bg-surface shadow-sm sm:rounded-lg"
    >
      <PostHeader post={post} href={href} isRepost={isRepost} />

      {post.body && <PostBody text={post.body} />}

      {post.media.length > 0 && (
        <div className={post.body ? "mt-3" : ""}>
          <MediaGrid media={post.media} href={href} ownerName={post.author.name} />
        </div>
      )}

      {post.repostOf && <EmbeddedOriginal original={post.repostOf} linkBase={linkBase} />}
      {post.repostUnavailable && (
        <div className="mx-4 mt-1 rounded-lg border border-border bg-surface-2 px-4 py-6 text-center text-[15px] text-muted">
          هذا المنشور لم يعد متاحاً
        </div>
      )}

      {counts && (
        <div className="mt-2 flex items-center justify-between gap-3 px-4 py-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            {post.likeCount > 0 && (
              <>
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-accent-fg">
                  <HeartIcon size={11} filled />
                </span>
                <span>
                  <span className="sr-only">الإعجابات: </span>
                  {formatNumber(post.likeCount)}
                </span>
              </>
            )}
          </span>
          <span className="flex items-center gap-1">
            {post.commentCount > 0 && <span>{formatNumber(post.commentCount)} تعليقاً</span>}
            {post.commentCount > 0 && post.repostCount > 0 && <span aria-hidden="true">·</span>}
            {post.repostCount > 0 && <span>{formatNumber(post.repostCount)} مشاركة</span>}
          </span>
        </div>
      )}

      {!readOnly && (
        <div className={`mx-4 grid grid-cols-3 gap-1 border-t border-border py-1 ${counts ? "" : "mt-3"}`}>
          {/* Placeholders until Phase 6 (likes, comments, reposts and the share link). */}
          <Button variant="ghost" size="sm" disabled title="قريباً" className="text-muted">
            <HeartIcon size={18} filled={post.likedByMe} className={post.likedByMe ? "text-accent" : ""} />
            أعجبني
          </Button>
          <Button variant="ghost" size="sm" disabled title="قريباً" className="text-muted">
            <CommentIcon size={18} />
            تعليق
          </Button>
          <Button variant="ghost" size="sm" disabled title="قريباً" className="text-muted">
            <ShareIcon size={18} />
            مشاركة
          </Button>
        </div>
      )}
      {readOnly && <div className="h-3" />}

      {footer && <div className="flex justify-end border-t border-border px-4 py-2">{footer}</div>}
    </article>
  );
}

function PostHeader({ post, href, isRepost }: { post: PostCard; href: string; isRepost: boolean }) {
  const { author } = post;
  return (
    <header className="flex items-start gap-2 px-4 pt-3">
      <Link href={`/u/${author.username}`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={-1} aria-hidden="true">
        <Avatar name={author.name} userId={author.id} src={author.avatarUrl} size="md" />
      </Link>
      <div className="min-w-0 flex-1 leading-5">
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <Link
            id={`post-${post.id}-author`}
            href={`/u/${author.username}`}
            className="truncate font-semibold text-text hover:underline"
          >
            {author.name}
          </Link>
          <span dir="ltr" className="truncate text-sm text-muted">
            @{author.username}
          </span>
          {isRepost && (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <RepostIcon size={14} />
              شارك منشوراً
            </span>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <PostTime createdAt={post.createdAt} href={href} />
          <span aria-hidden="true">·</span>
          <GlobeIcon size={13} />
          <span className="sr-only">عام</span>
          {post.moderationState === "HIDDEN" && <Badge tone="danger">مخفي من قِبل الإدارة</Badge>}
        </p>
      </div>
    </header>
  );
}

function PostTime({ createdAt, href }: { createdAt: string; href: string }) {
  return (
    <Link href={href} className="hover:underline">
      {/* Relative time differs by a minute between server and client renders: not an error. */}
      <time dateTime={createdAt} title={formatDateTime(createdAt)} suppressHydrationWarning>
        {relativeTime(createdAt)}
      </time>
    </Link>
  );
}

function PostBody({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <p
      dir="auto"
      className={`whitespace-pre-line break-words px-4 text-start ${small ? "pt-2 text-[15px]" : "pt-2 text-base"}`}
    >
      {text}
    </p>
  );
}

/** The original of a repost, one level, inside a bordered box. */
function EmbeddedOriginal({ original, linkBase }: { original: PostOriginal; linkBase: "/posts" | "/p" }) {
  const href = `${linkBase}/${original.id}`;
  const { author } = original;
  return (
    <div className="mx-4 mt-3 overflow-hidden rounded-lg border border-border">
      <div className="flex items-start gap-2 px-3 pt-3">
        <Avatar name={author.name} userId={author.id} src={author.avatarUrl} size="sm" />
        <div className="min-w-0 leading-5">
          <Link href={`/u/${author.username}`} className="font-semibold text-text hover:underline">
            {author.name}
          </Link>
          <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
            <PostTime createdAt={original.createdAt} href={href} />
            {original.kind === "REEL" && <Badge tone="primary">ريل</Badge>}
            {original.moderationState === "HIDDEN" && <Badge tone="danger">مخفي من قِبل الإدارة</Badge>}
          </p>
        </div>
      </div>
      {original.body && (
        <div className="-mx-1">
          <PostBody text={original.body} small />
        </div>
      )}
      {original.media.length > 0 ? (
        <div className="mt-3">
          <MediaGrid media={original.media} href={href} ownerName={author.name} />
        </div>
      ) : (
        <div className="h-3" />
      )}
    </div>
  );
}

/** Keeps very tall or very wide media inside sensible boxes (4:5 to 1.91:1, like feed apps). */
function ratio(m: PostMedia, min = 0.8, max = 1.91): number {
  if (!m.width || !m.height) return 1;
  return Math.min(max, Math.max(min, m.width / m.height));
}

const TILE = "block h-full w-full bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

/**
 * 1 photo full width; 2 side by side; 3 as one large + two small; 4 as a 2×2 grid; or one video.
 * Every box has an aspect ratio up front, so nothing jumps while images load.
 */
function MediaGrid({ media, href, ownerName }: { media: PostMedia[]; href: string; ownerName: string }) {
  const first = media[0];
  if (first.kind === "VIDEO") {
    return (
      <div className="bg-overlay" style={{ aspectRatio: ratio(first, 0.8, 1.91) }}>
        <video
          src={first.url}
          controls
          playsInline
          preload="metadata"
          aria-label={`فيديو من ${ownerName}${first.durationMs ? `، مدته ${formatDuration(first.durationMs)}` : ""}`}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  const n = media.length;
  const img = (m: PostMedia, i: number) => (
    <Link key={m.id} href={href} className={`${TILE} ${n === 3 && i === 0 ? "row-span-2" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin /media files, no optimiser */}
      <img
        src={m.url}
        alt={n === 1 ? `صورة من ${ownerName}` : `صورة ${formatNumber(i + 1)} من ${formatNumber(n)} من ${ownerName}`}
        width={m.width ?? undefined}
        height={m.height ?? undefined}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </Link>
  );

  if (n === 1) {
    return <div style={{ aspectRatio: ratio(first) }}>{img(first, 0)}</div>;
  }
  if (n === 3) {
    return <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5">{media.map(img)}</div>;
  }
  // 2 → one row of squares; 4 → 2×2.
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {media.map((m, i) => (
        <div key={m.id} className="aspect-square">
          {img(m, i)}
        </div>
      ))}
    </div>
  );
}
