// Shared domain types (mirrors of the API responses).

export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

/** Another person, as the API shows them (no email, role or suspension fields). */
export interface PublicUser {
  id: number;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

/** GET /users/:username. Counts cover visible content only. */
export interface ProfileUser extends PublicUser {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  reelsCount: number;
  isMe: boolean;
}

/** GET /auth/me and the `user` of /auth/login and /auth/register. */
export interface SafeUser {
  id: number;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

/** The only client state (Redux): the signed-in user's snapshot. */
export interface CurrentUser {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
}

export type MediaKind = "IMAGE" | "VIDEO";
export type ModerationState = "VISIBLE" | "HIDDEN";

/** POST /media/images | /media/videos (a pending upload). */
export interface MediaUpload {
  id: string;
  url: string;
  kind: MediaKind;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sizeBytes: number;
}

export interface PostMedia {
  id: string;
  url: string;
  kind: MediaKind;
  width: number | null;
  height: number | null;
  durationMs: number | null;
}

/** A post card without the repost level (also the shape of `repostOf`). */
export interface PostOriginal {
  id: number;
  kind: "POST" | "REEL";
  body: string | null;
  createdAt: string;
  /** HIDDEN only ever reaches the author and admins. */
  moderationState: ModerationState;
  author: PublicUser;
  media: PostMedia[];
  likesCount: number;
  /** Visible comments by active authors (hidden ones are never counted). */
  commentsCount: number;
  repostsCount: number;
  /** Absent on the public endpoint. */
  likedByMe?: boolean;
  repostedByMe?: boolean;
}

/** GET /posts/:id, /posts/:id/public and every feed item. */
export interface PostCard extends PostOriginal {
  /** The original (one level) when this is a repost the viewer may see. */
  repostOf: PostOriginal | null;
  /** A repost whose original is hidden or by a suspended author: show "no longer available". */
  repostUnavailable: boolean;
}

/** POST | DELETE /posts/:id/like (both idempotent). */
export interface LikeResult {
  liked: boolean;
  likesCount: number;
}

/** GET /posts/:id/comments items and POST /posts/:id/comments. */
export interface CommentItem {
  id: number;
  postId: number;
  body: string;
  createdAt: string;
  /** HIDDEN only ever reaches the comment author and admins. */
  moderationState: ModerationState;
  author: PublicUser;
  /** The comment author or the post author. */
  canDelete: boolean;
}

/** Cursor pagination (CLAUDE.md §4.5). */
export interface Page<T> {
  items: T[];
  nextCursor: number | null;
}

export interface FieldErrorDetail {
  field: string;
  constraints: string[];
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
