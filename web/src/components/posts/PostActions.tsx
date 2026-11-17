"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
} from "react";
import {
  CommentIcon,
  HeartIcon,
  LinkIcon,
  QuoteIcon,
  RepostIcon,
  ShareIcon,
  UndoIcon,
} from "@/components/layout/nav";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { repostAction, setLike, type RepostState } from "@/lib/actions/posts";
import { compactCount } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";

/** What the action row needs from a card (plain JSON, so it is cheap to pass from a Server Component). */
export interface PostActionsData {
  postId: number;
  authorName: string;
  likedByMe: boolean;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  /** For a repost card this is about its original (reposts always point to the original). */
  repostedByMe: boolean;
  /** The author of what a repost would point to; null when that original is no longer available. */
  repostTargetAuthorId: number | null;
  /** This card is itself a repost (its own reposts count never changes). */
  isRepost: boolean;
}

/** The counts row: coral heart + likes on the start side, "x تعليقاً · y مشاركة" on the end side. */
export function CountsRow({
  postId,
  likesCount,
  commentsCount,
  repostsCount,
  commentsHref,
}: {
  postId: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  /** Link for the comments count (none on the public page). */
  commentsHref?: string;
}) {
  if (likesCount + commentsCount + repostsCount === 0) return null;
  const comments = `${compactCount(commentsCount)} تعليقاً`;
  return (
    <div className="mt-2 flex items-center justify-between gap-3 px-4 py-1 text-sm text-muted" data-counts={postId}>
      <span className="flex items-center gap-1.5">
        {likesCount > 0 && (
          <>
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-accent-fg">
              <HeartIcon size={11} filled />
            </span>
            <span data-likes>
              <span className="sr-only">الإعجابات: </span>
              {compactCount(likesCount)}
            </span>
          </>
        )}
      </span>
      <span className="flex items-center gap-1">
        {commentsCount > 0 &&
          (commentsHref ? (
            <Link href={commentsHref} className="hover:underline">
              {comments}
            </Link>
          ) : (
            <span>{comments}</span>
          ))}
        {commentsCount > 0 && repostsCount > 0 && <span aria-hidden="true">·</span>}
        {repostsCount > 0 && <span>{compactCount(repostsCount)} مشاركة</span>}
      </span>
    </div>
  );
}

const MENU_ITEM =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-[15px] font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent";
const MENU_ICON = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2";

const repostInitial: RepostState = {};

/**
 * The counts row and the 3-button action row (أعجبني / تعليق / مشاركة) of a post card.
 * - Like: optimistic (useOptimistic) + the setLike Server Action, with hidden postId / like fields.
 * - Comment: a link to /posts/[id]#comments.
 * - مشاركة: a menu with repost / quote (dialog) / undo, and the share link (/p/<id>).
 * Server data stays the truth: when the props change (a revalidated page), local state resets to them.
 */
export function PostActions({ data }: { data: PostActionsData }) {
  const me = useAppSelector((s) => s.currentUser);
  const { postId } = data;

  // Local copies of the server values (the "load more" cards never get new props).
  const snapshot = `${data.likedByMe}|${data.likesCount}|${data.repostedByMe}|${data.repostsCount}`;
  const [seen, setSeen] = useState(snapshot);
  const [likes, setLikes] = useState({ liked: data.likedByMe, count: data.likesCount });
  const [reposts, setReposts] = useState({ reposted: data.repostedByMe, count: data.repostsCount });
  if (seen !== snapshot) {
    setSeen(snapshot);
    setLikes({ liked: data.likedByMe, count: data.likesCount });
    setReposts({ reposted: data.repostedByMe, count: data.repostsCount });
  }

  const [optimistic, toggleOptimistic] = useOptimistic(likes, (cur, liked: boolean) =>
    liked === cur.liked ? cur : { liked, count: Math.max(0, cur.count + (liked ? 1 : -1)) },
  );
  const [popped, setPopped] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);

  async function likeFormAction(form: FormData) {
    const liked = form.get("like") === "1";
    toggleOptimistic(liked);
    setPopped(liked);
    setMessage(null);
    const res = await setLike(form);
    startTransition(() => {
      if (res.message !== undefined || res.liked === undefined || res.likesCount === undefined) {
        setMessage(res.message ?? null);
        return;
      }
      setLikes({ liked: res.liked, count: res.likesCount });
    });
  }

  // ── share menu ──
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [repostState, repostDispatch, repostPending] = useActionState(repostAction, repostInitial);

  useEffect(() => {
    if (!menuOpen) return;
    document.getElementById(menuId)?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRoot.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, menuId]);

  // A finished repost / undo: update the card, close the menu and the quote dialog.
  const handledNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!repostState.ok || repostState.nonce === handledNonce.current) return;
    handledNonce.current = repostState.nonce;
    const reposted = repostState.reposted === true;
    setReposts((cur) =>
      cur.reposted === reposted
        ? cur
        : { reposted, count: data.isRepost ? cur.count : Math.max(0, cur.count + (reposted ? 1 : -1)) },
    );
    setMenuOpen(false);
    dialogRef.current?.close();
    setToast({ text: reposted ? "تمت إعادة النشر" : "أُلغيت إعادة النشر", key: Date.now() });
  }, [repostState, data.isRepost]);

  // The toast leaves the DOM when its CSS animation is over.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function shareLink() {
    setMenuOpen(false);
    const url = `${window.location.origin}/p/${postId}`;
    // The native share sheet on phones (it needs a secure context: https or localhost).
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ url, title: `منشور ${data.authorName} على سلاميديا` });
      } catch {
        // Cancelled by the user: nothing to do.
      }
      return;
    }
    setToast({ text: (await copy(url)) ? "تم نسخ الرابط" : `انسخ الرابط: ${url}`, key: Date.now() });
  }

  const canRepost = data.repostTargetAuthorId !== null && data.repostTargetAuthorId !== me?.id;
  const repostHint =
    data.repostTargetAuthorId === null
      ? "المنشور الأصلي لم يعد متاحاً"
      : data.repostTargetAuthorId === me?.id
        ? "لا يمكنك إعادة نشر منشورك"
        : null;

  return (
    <>
      <CountsRow
        postId={postId}
        likesCount={optimistic.count}
        commentsCount={data.commentsCount}
        repostsCount={reposts.count}
        commentsHref={`/posts/${postId}#comments`}
      />

      <div
        className={`mx-4 grid grid-cols-3 gap-1 border-t border-border py-1 ${
          optimistic.count + data.commentsCount + reposts.count > 0 ? "" : "mt-3"
        }`}
      >
        <form action={likeFormAction} className="contents">
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="like" value={optimistic.liked ? "0" : "1"} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            aria-pressed={optimistic.liked}
            className={optimistic.liked ? "text-accent" : "text-muted"}
          >
            <span
              key={optimistic.liked ? "on" : "off"}
              className={`inline-flex ${popped && optimistic.liked ? "animate-like-pop motion-reduce:animate-none" : ""}`}
            >
              <HeartIcon size={18} filled={optimistic.liked} />
            </span>
            أعجبني
          </Button>
        </form>

        <Link
          href={`/posts/${postId}#comments`}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CommentIcon size={18} />
          تعليق
        </Link>

        <div ref={menuRoot} className="relative">
          <button
            ref={menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              fullWidth: true,
              className: reposts.reposted ? "text-primary" : "text-muted",
            })}
          >
            {reposts.reposted ? <RepostIcon size={18} /> : <ShareIcon size={18} />}
            مشاركة
            {reposts.reposted && <span className="sr-only">(أعدت نشره)</span>}
          </button>

          {menuOpen && (
            <div
              id={menuId}
              className="absolute end-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] origin-top animate-menu-in rounded-lg bg-surface p-1.5 shadow-lg motion-reduce:animate-none"
            >
              {reposts.reposted ? (
                <form action={repostDispatch}>
                  <input type="hidden" name="postId" value={postId} />
                  <input type="hidden" name="intent" value="undo" />
                  <button type="submit" className={MENU_ITEM} disabled={repostPending}>
                    <span className={MENU_ICON}>
                      <UndoIcon size={16} />
                    </span>
                    تراجع عن إعادة النشر
                  </button>
                </form>
              ) : (
                <>
                  <form action={repostDispatch}>
                    <input type="hidden" name="postId" value={postId} />
                    <input type="hidden" name="intent" value="repost" />
                    <button type="submit" className={MENU_ITEM} disabled={!canRepost || repostPending}>
                      <span className={MENU_ICON}>
                        <RepostIcon size={16} />
                      </span>
                      إعادة نشر
                    </button>
                  </form>
                  <button
                    type="button"
                   
                    className={MENU_ITEM}
                    disabled={!canRepost}
                    onClick={() => {
                      setMenuOpen(false);
                      setQuoteOpen(true);
                      dialogRef.current?.showModal();
                    }}
                  >
                    <span className={MENU_ICON}>
                      <QuoteIcon size={16} />
                    </span>
                    اقتباس
                  </button>
                </>
              )}
              {repostHint && !reposts.reposted && <p className="px-3 pb-1 text-xs text-muted">{repostHint}</p>}
              <div className="my-1 border-t border-border" />
              <button type="button" className={MENU_ITEM} onClick={shareLink}>
                <span className={MENU_ICON}>
                  <LinkIcon size={16} />
                </span>
                مشاركة الرابط
              </button>
            </div>
          )}
        </div>
      </div>

      {(message || (repostState.message && !repostPending && !quoteOpen)) && (
        <p role="alert" className="mx-4 mb-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {message ?? repostState.message}
        </p>
      )}

      {/* Quote: a repost with a short text of your own above the original. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={`quote-title-${postId}`}
        onClose={() => setQuoteOpen(false)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border-0 bg-surface p-0 text-text shadow-lg backdrop:bg-overlay/60"
      >
        <form action={repostDispatch} className="flex flex-col gap-3 p-4">
          <h2 id={`quote-title-${postId}`} className="text-lg font-bold">
            اقتباس منشور {data.authorName}
          </h2>
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="intent" value="repost" />
          <Field
            textarea
            id={`quote-body-${postId}`}
            name="body"
            label="أضف تعليقك (اختياري)"
            hint="يظهر نصك فوق المنشور الأصلي. الحد ٢٠٠٠ حرف."
            maxLength={2000}
            rows={4}
            dir="auto"
            defaultValue={repostState.body}
            key={repostState.nonce ?? "quote"}
          />
          {repostState.message && !repostPending && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {repostState.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => dialogRef.current?.close()} disabled={repostPending}>
              إلغاء
            </Button>
            <Button type="submit" pending={repostPending}>
              مشاركة
            </Button>
          </div>
        </form>
      </dialog>

      {toast && (
        <div
          key={toast.key}
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto w-fit max-w-[calc(100vw-2rem)] animate-toast break-all rounded-lg bg-text px-4 py-2.5 text-sm font-medium text-bg shadow-lg motion-reduce:animate-none md:bottom-6"
        >
          {toast.text}
        </div>
      )}
    </>
  );
}

/** Clipboard API where allowed (https / localhost), else the old copy command (plain http on the LAN). */
async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}
