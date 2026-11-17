"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { TrashIcon } from "@/components/layout/nav";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  addComment,
  deleteComment,
  loadComments,
  type CommentFormState,
  type DeleteCommentState,
} from "@/lib/actions/posts";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { CommentItem } from "@/lib/types";

const MAX_COMMENT = 500;
const composerInitial: CommentFormState = {};
const deleteInitial: DeleteCommentState = {};

/**
 * The comment form at the top of the comments section. The post id is a hidden field (never
 * .bind()), and the action is passed straight to the form, so it also works before hydration.
 */
export function CommentComposer({ postId }: { postId: number }) {
  const [state, action, pending] = useActionState(addComment, composerInitial);
  return (
    <form action={action} key={state.nonce ?? "new"} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={postId} />
      <Field
        textarea
        id={`comment-body-${postId}`}
        name="body"
        label="أضف تعليقاً"
        placeholder="اكتب تعليقك…"
        maxLength={MAX_COMMENT}
        rows={2}
        dir="auto"
        required
        defaultValue={state.body}
        error={state.message}
        hint="حتى ٥٠٠ حرف."
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" pending={pending}>
          تعليق
        </Button>
      </div>
    </form>
  );
}

/** One comment: avatar, a bubble with the name and text, then the time and (when allowed) delete. */
export function CommentView({ comment, postId }: { comment: CommentItem; postId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteComment, deleteInitial);
  if (state.ok) return null; // deleted (the server list is revalidated too)

  const { author } = comment;
  return (
    <li className="flex items-start gap-2" data-comment={comment.id}>
      <Link href={`/u/${author.username}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <Avatar name={author.name} userId={author.id} src={author.avatarUrl} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-lg bg-surface-2 px-3 py-2">
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm leading-5">
            <Link href={`/u/${author.username}`} className="font-semibold text-text hover:underline">
              {author.name}
            </Link>
            <span dir="ltr" className="text-xs text-muted">
              @{author.username}
            </span>
          </p>
          <p dir="auto" className="whitespace-pre-line break-words text-start text-[15px] leading-7">
            {comment.body}
          </p>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted">
          <time dateTime={comment.createdAt} title={formatDateTime(comment.createdAt)} suppressHydrationWarning>
            {relativeTime(comment.createdAt)}
          </time>
          {comment.moderationState === "HIDDEN" && <Badge tone="danger">مخفي من قِبل الإدارة</Badge>}
          {comment.canDelete && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1 rounded font-semibold hover:text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <TrashIcon size={12} />
              حذف
            </button>
          )}
        </div>
        {confirming && (
          <form action={action} className="mt-1 flex flex-wrap items-center gap-2 px-1">
            <input type="hidden" name="commentId" value={comment.id} />
            <input type="hidden" name="postId" value={postId} />
            <span className="text-sm font-medium text-text">حذف هذا التعليق؟</span>
            <Button type="submit" variant="danger" size="sm" pending={pending} autoFocus>
              نعم، احذف
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
              إلغاء
            </Button>
            {state.message && (
              <p role="alert" className="w-full text-sm text-danger">
                {state.message}
              </p>
            )}
          </form>
        )}
      </div>
    </li>
  );
}

/**
 * "تعليقات أقدم" under the server-rendered first page. Later pages come from a Server Action as
 * JSON. The page keys it by the first page's ids, so it starts over after a revalidation.
 */
export function LoadMoreComments({ postId, initialCursor }: { postId: number; initialCursor: number | null }) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!cursor && items.length === 0) return null;

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const res = await loadComments(postId, cursor);
      if (!res.page) {
        setMessage(res.message ?? null);
        return;
      }
      const page = res.page;
      setMessage(null);
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...page.items.filter((c) => !seen.has(c.id))];
      });
      setCursor(page.nextCursor);
    });
  }

  return (
    <>
      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <CommentView key={c.id} comment={c} postId={postId} />
          ))}
        </ul>
      )}
      {message && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {message}
        </p>
      )}
      {cursor ? (
        <Button variant="ghost" size="sm" pending={pending} onClick={loadMore} className="self-start !text-muted">
          عرض تعليقات أقدم
        </Button>
      ) : (
        <p className="text-center text-xs text-muted">لا توجد تعليقات أقدم</p>
      )}
    </>
  );
}
