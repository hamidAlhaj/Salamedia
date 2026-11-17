"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { ApiError, apiFetch } from "../api";
import { errorMessage, fieldErrors } from "../errors";
import { requireSessionToken } from "../session";
import type { MediaUpload, Page, PostCard } from "../types";

/** useActionState result for the composer. `body` refills the textarea after a failure. */
export interface ComposerState {
  ok?: boolean;
  message?: string;
  body?: string;
  /** Changes on every success so the composer can reset itself. */
  nonce?: number;
}

export interface DeletePostState {
  message?: string;
}

export interface FeedPageResult {
  page?: Page<PostCard>;
  message?: string;
}

const MAX_IMAGES = 4;

/** Untrusted id from a form field or a client call: a positive 32-bit integer, else null. */
function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : null;
}

const files = (form: FormData, key: string): File[] =>
  form.getAll(key).filter((v): v is File => typeof v !== "string" && v.size > 0);

function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "VALIDATION_FAILED") {
      const fields = fieldErrors(err.details);
      const first = Object.values(fields)[0];
      if (first) return first;
    }
    return errorMessage(err.code);
  }
  return errorMessage(null);
}

/**
 * Composer submit: uploads each file to /media/images or /media/videos with the session token,
 * then POST /posts with the media ids in the order chosen. The API is the authority on every rule;
 * the only pre-check here avoids uploading files that can never form a valid post.
 */
export async function createPost(_prev: ComposerState, form: FormData): Promise<ComposerState> {
  const token = await requireSessionToken();
  const rawBody = form.get("body");
  const body = typeof rawBody === "string" ? rawBody : "";
  const images = files(form, "images");
  const videos = files(form, "video");

  if (images.length > MAX_IMAGES || videos.length > 1 || (images.length > 0 && videos.length > 0)) {
    return { message: errorMessage("POST_MEDIA_INVALID"), body };
  }

  try {
    const uploads = videos.length
      ? [{ file: videos[0], path: "/media/videos" }]
      : images.map((file) => ({ file, path: "/media/images" }));
    // Promise.all keeps the order of the files, which becomes the media position.
    const media = await Promise.all(
      uploads.map(({ file, path }) => {
        const fd = new FormData();
        fd.append("file", file, file.name || "upload");
        return apiFetch<MediaUpload>(path, { method: "POST", token, body: fd });
      }),
    );
    await apiFetch<PostCard>("/posts", {
      method: "POST",
      token,
      json: { ...(body.trim() ? { body } : {}), mediaIds: media.map((m) => m.id) },
    });
  } catch (err) {
    unstable_rethrow(err); // keep apiFetch's redirect to /auth/end-session
    return { message: apiErrorMessage(err), body };
  }

  revalidatePath("/home");
  return { ok: true, nonce: Date.now() };
}

/** "Load more" on /home: the next page after `cursor`, as plain JSON. */
export async function loadHomeFeed(cursor: unknown): Promise<FeedPageResult> {
  const after = positiveInt(cursor);
  if (!after) return { message: errorMessage("VALIDATION_FAILED") };
  const token = await requireSessionToken();
  try {
    return { page: await apiFetch<Page<PostCard>>(`/feed/home?cursor=${after}&limit=10`, { token }) };
  } catch (err) {
    unstable_rethrow(err);
    return { message: apiErrorMessage(err) };
  }
}

/** Delete my post. The id comes from a hidden `postId` field (never .bind()). */
export async function deletePost(_prev: DeletePostState, form: FormData): Promise<DeletePostState> {
  const id = positiveInt(form.get("postId"));
  if (!id) return { message: errorMessage("VALIDATION_FAILED") };
  const token = await requireSessionToken();
  try {
    await apiFetch<void>(`/posts/${id}`, { method: "DELETE", token });
  } catch (err) {
    unstable_rethrow(err);
    return { message: apiErrorMessage(err) };
  }
  revalidatePath("/home");
  redirect("/home");
}
