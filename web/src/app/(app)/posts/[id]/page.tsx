import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CommentIcon } from "@/components/layout/nav";
import { SideColumns } from "@/components/layout/SideColumns";
import { CommentComposer, CommentView, LoadMoreComments } from "@/components/posts/Comments";
import { DeletePostButton } from "@/components/posts/DeletePostButton";
import { PostCardView } from "@/components/posts/PostCard";
import { Card } from "@/components/ui/Card";
import { ApiError, apiFetch, fetchMe } from "@/lib/api";
import { requireSessionToken } from "@/lib/session";
import type { CommentItem, Page, PostCard } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/** The post, or null when the API says 404 (missing, hidden, or by a suspended author). */
const getPost = cache(async (id: string, token: string): Promise<PostCard | null> => {
  if (!/^[1-9]\d{0,9}$/.test(id)) return null;
  try {
    return await apiFetch<PostCard>(`/posts/${id}`, { token });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id, await requireSessionToken());
  return { title: post ? `منشور ${post.author.name}` : "منشور غير موجود" };
}

export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const token = await requireSessionToken();
  const [post, me] = await Promise.all([getPost(id, token), fetchMe(token)]);
  if (!post) notFound();
  const comments = await apiFetch<Page<CommentItem>>(`/posts/${post.id}/comments?limit=20`, { token });

  return (
    <SideColumns>
      <h1 className="sr-only">منشور {post.author.name}</h1>
      <PostCardView post={post} footer={post.author.id === me.id ? <DeletePostButton postId={post.id} /> : undefined} />

      <Card flush id="comments" aria-labelledby="comments-title" className="mt-2 scroll-mt-20 sm:mt-4">
        <h2 id="comments-title" className="mb-3 text-lg font-bold">
          التعليقات
        </h2>
        <CommentComposer postId={post.id} />

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          {comments.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-muted">
              <CommentIcon size={28} />
              <p className="text-[15px]">لا توجد تعليقات بعد. كن أول من يعلّق.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.items.map((c) => (
                <CommentView key={c.id} comment={c} postId={post.id} />
              ))}
            </ul>
          )}
          <LoadMoreComments
            key={comments.items.map((c) => c.id).join(",")}
            postId={post.id}
            initialCursor={comments.nextCursor}
          />
        </div>
      </Card>
    </SideColumns>
  );
}
