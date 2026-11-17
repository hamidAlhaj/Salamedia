import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CommentIcon } from "@/components/layout/nav";
import { SideColumns } from "@/components/layout/SideColumns";
import { DeletePostButton } from "@/components/posts/DeletePostButton";
import { PostCardView } from "@/components/posts/PostCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError, apiFetch, fetchMe } from "@/lib/api";
import { requireSessionToken } from "@/lib/session";
import type { PostCard } from "@/lib/types";

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

  return (
    <SideColumns>
      <h1 className="sr-only">منشور {post.author.name}</h1>
      <PostCardView post={post} footer={post.author.id === me.id ? <DeletePostButton postId={post.id} /> : undefined} />
      <Card flush className="mt-2 sm:mt-4">
        {/* Placeholder until Phase 6 (comments). */}
        <EmptyState
          icon={<CommentIcon size={28} />}
          title="التعليقات قريباً"
          description="هنا ستظهر التعليقات على هذا المنشور، ويمكنك إضافة تعليقك."
        />
      </Card>
    </SideColumns>
  );
}
