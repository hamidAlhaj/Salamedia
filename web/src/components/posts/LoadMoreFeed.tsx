"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { loadHomeFeed } from "@/lib/actions/posts";
import type { PostCard } from "@/lib/types";
import { PostCardView } from "./PostCard";

/**
 * "عرض المزيد" under the server-rendered first page. Later pages come from a Server Action as
 * JSON and render with the same PostCardView. Keyed by the first post id on /home, so it
 * starts over when a new post appears at the top.
 */
export function LoadMoreFeed({ initialCursor }: { initialCursor: number | null }) {
  const [items, setItems] = useState<PostCard[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const res = await loadHomeFeed(cursor);
      if (!res.page) {
        setMessage(res.message ?? null);
        return;
      }
      const page = res.page;
      setMessage(null);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.nextCursor);
    });
  }

  return (
    <>
      {items.map((post) => (
        <PostCardView key={post.id} post={post} />
      ))}
      {message && (
        <p role="alert" className="mx-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger sm:mx-0">
          {message}
        </p>
      )}
      <div className="px-4 pb-2 sm:px-0">
        {cursor ? (
          <Button variant="secondary" fullWidth pending={pending} onClick={loadMore}>
            عرض المزيد
          </Button>
        ) : (
          <p className="py-2 text-center text-sm text-muted">وصلت إلى آخر المنشورات</p>
        )}
      </div>
    </>
  );
}
