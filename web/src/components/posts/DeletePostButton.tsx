"use client";

import { useActionState, useState } from "react";
import { TrashIcon } from "@/components/layout/nav";
import { Button } from "@/components/ui/Button";
import { deletePost, type DeletePostState } from "@/lib/actions/posts";

const initial: DeletePostState = {};

/** Delete my post: a first click asks, a second (inline) click confirms. The id is a hidden field. */
export function DeletePostButton({ postId }: { postId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deletePost, initial);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-danger">
        <TrashIcon size={16} />
        حذف المنشور
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="postId" value={postId} />
      <span className="text-sm font-medium text-text">سيُحذف المنشور نهائياً. متأكد؟</span>
      <Button type="submit" variant="danger" size="sm" pending={pending} autoFocus>
        نعم، احذف
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        إلغاء
      </Button>
      {state.message && (
        <p role="alert" className="w-full text-end text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
