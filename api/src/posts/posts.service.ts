import { Injectable, Logger } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaKind, ModerationState, PostKind, Prisma, type UserStatus } from '@prisma/client';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors';
import { MEDIA_DIR } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { avatarUrl, PublicUser } from '../users/users.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CursorQueryDto } from './dto/cursor-query.dto';

const MAX_IMAGES = 4;
const HOME_FEED_DEFAULT_LIMIT = 10;
const INT_MAX = 2147483647;

// ───────────── response shapes (Swagger) ─────────────

export class PostMediaItem {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: '/media/5a1a3ed1-0000-4000-8000-000000000001.png' }) url!: string;
  @ApiProperty({ enum: MediaKind }) kind!: MediaKind;
  @ApiProperty({ type: Number, nullable: true }) width!: number | null;
  @ApiProperty({ type: Number, nullable: true }) height!: number | null;
  @ApiProperty({ type: Number, nullable: true, description: 'Videos only' }) durationMs!: number | null;
}

/** A post as a card, without the repost level. Also the shape of `repostOf`. */
export class PostOriginal {
  @ApiProperty() id!: number;
  @ApiProperty({ enum: PostKind }) kind!: PostKind;
  @ApiProperty({ type: String, nullable: true }) body!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({
    enum: ModerationState,
    description: 'HIDDEN is only ever returned to the author and to admins',
  })
  moderationState!: ModerationState;
  @ApiProperty({ type: PublicUser }) author!: PublicUser;
  @ApiProperty({ type: [PostMediaItem], description: 'Ordered by position' }) media!: PostMediaItem[];
  @ApiProperty({ description: 'Likes by active users' }) likeCount!: number;
  @ApiProperty({ description: 'Visible comments by active users' }) commentCount!: number;
  @ApiProperty({ description: 'Visible reposts by active users' }) repostCount!: number;
  @ApiPropertyOptional({ description: 'Absent on the public endpoint' }) likedByMe?: boolean;
  @ApiPropertyOptional({ description: 'Absent on the public endpoint' }) repostedByMe?: boolean;
}

export class PostCard extends PostOriginal {
  @ApiProperty({
    type: PostOriginal,
    nullable: true,
    description: 'The original (one level) when this is a repost and the viewer may see it',
  })
  repostOf!: PostOriginal | null;

  @ApiProperty({
    description:
      'True when this is a repost whose original is hidden or whose author is suspended. ' +
      'repostOf is then null and the client shows "this post is no longer available".',
  })
  repostUnavailable!: boolean;
}

export class FeedPage {
  @ApiProperty({ type: [PostCard] }) items!: PostCard[];
  @ApiProperty({ type: Number, nullable: true, description: 'Pass as ?cursor= for the next page; null at the end' })
  nextCursor!: number | null;
}

// ───────────── the one shared select ─────────────

/** Card fields of one post. `meId` scopes likedByMe / repostedByMe (pass 0 for guests: no user has id 0). */
function cardFields(meId: number) {
  return {
    id: true,
    kind: true,
    body: true,
    createdAt: true,
    moderationState: true,
    authorId: true,
    author: {
      select: { id: true, username: true, name: true, bio: true, avatarPath: true, createdAt: true, status: true },
    },
    media: {
      orderBy: { position: 'asc' },
      select: { id: true, fileName: true, kind: true, width: true, height: true, durationMs: true },
    },
    _count: {
      select: {
        likes: { where: { user: { status: 'ACTIVE' } } },
        comments: { where: { moderationState: 'VISIBLE', author: { status: 'ACTIVE' } } },
        reposts: { where: { moderationState: 'VISIBLE', author: { status: 'ACTIVE' } } },
      },
    },
    likes: { where: { userId: meId }, take: 1, select: { userId: true } },
    reposts: { where: { authorId: meId }, take: 1, select: { id: true } },
  } satisfies Prisma.PostSelect;
}

/**
 * The single Prisma select for a post card, used everywhere a post is returned: the post, its
 * author and ordered media, filtered counts, the *ByMe flags, and for a repost the original with
 * the same shape (one level). The query count per page is constant (no N+1).
 */
export function postCardSelect(meId: number) {
  return {
    ...cardFields(meId),
    repostOfId: true,
    repostOf: { select: cardFields(meId) },
  } satisfies Prisma.PostSelect;
}

type CardRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postCardSelect> }>;
type OriginalRow = Prisma.PostGetPayload<{ select: ReturnType<typeof cardFields> }>;

/** Who is looking: a signed-in user, or null for the public share page. */
type Viewer = AuthUser | null;

/**
 * CLAUDE.md §4.4: hidden content is visible only to its author and admins; content by suspended
 * authors only to admins.
 */
function canView(
  p: { authorId: number; moderationState: ModerationState; author: { status: UserStatus } },
  viewer: Viewer,
): boolean {
  if (viewer?.role === 'ADMIN') return true;
  if (p.author.status !== 'ACTIVE') return false;
  return p.moderationState === 'VISIBLE' || p.authorId === viewer?.id;
}

function toOriginal(row: OriginalRow, withByMe: boolean): PostOriginal {
  const { author } = row;
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.createdAt,
    moderationState: row.moderationState,
    author: {
      id: author.id,
      username: author.username,
      name: author.name,
      bio: author.bio,
      avatarUrl: avatarUrl(author.avatarPath),
      createdAt: author.createdAt,
    },
    media: row.media.map((m) => ({
      id: m.id,
      url: `/media/${m.fileName}`,
      kind: m.kind,
      width: m.width,
      height: m.height,
      durationMs: m.durationMs,
    })),
    likeCount: row._count.likes,
    commentCount: row._count.comments,
    repostCount: row._count.reposts,
    ...(withByMe ? { likedByMe: row.likes.length > 0, repostedByMe: row.reposts.length > 0 } : {}),
  };
}

/** Maps a postCardSelect row to the API card. Pass viewer = null for the public shape. */
export function toPostCard(row: CardRow, viewer: Viewer): PostCard {
  const original = row.repostOf && canView(row.repostOf, viewer) ? toOriginal(row.repostOf, viewer !== null) : null;
  return {
    ...toOriginal(row, viewer !== null),
    repostOf: original,
    repostUnavailable: row.repostOfId !== null && original === null,
  };
}

const notFound = () => new AppError('NOT_FOUND', 404, 'Post not found');

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /posts (kind POST). Rules (CLAUDE.md §4.3): non-blank body or media (POST_EMPTY); 1–4 images
   * or exactly 1 video (POST_MEDIA_INVALID); every media id owned by the author (MEDIA_NOT_OWNED) and
   * still pending (MEDIA_ALREADY_ATTACHED). Attaching is one conditional UPDATE inside the transaction,
   * so two concurrent requests with the same media id cannot both succeed.
   */
  async create(viewer: AuthUser, dto: CreatePostDto): Promise<PostCard> {
    const body = dto.body ? dto.body : null; // already trimmed by the DTO; '' → null
    const ids = dto.mediaIds ?? [];

    if (!body && ids.length === 0) throw new AppError('POST_EMPTY', 400, 'A post needs text or media');
    if (new Set(ids).size !== ids.length) {
      throw new AppError('POST_MEDIA_INVALID', 400, 'The same media id is listed twice');
    }
    if (ids.length > MAX_IMAGES) {
      throw new AppError('POST_MEDIA_INVALID', 400, `At most ${MAX_IMAGES} images or 1 video`);
    }

    const postId = await this.prisma.$transaction(async (tx) => {
      if (ids.length > 0) {
        const media = await tx.media.findMany({
          where: { id: { in: ids } },
          select: { id: true, ownerId: true, postId: true, kind: true },
        });
        // An unknown id is reported like someone else's: it is not yours to attach.
        if (media.length !== ids.length || media.some((m) => m.ownerId !== viewer.id)) {
          throw new AppError('MEDIA_NOT_OWNED', 403, 'Media not found or owned by someone else');
        }
        if (media.some((m) => m.postId !== null)) {
          throw new AppError('MEDIA_ALREADY_ATTACHED', 409, 'Media is already attached to a post');
        }
        const videos = media.filter((m) => m.kind === MediaKind.VIDEO).length;
        if (videos > 0 && media.length !== 1) {
          throw new AppError('POST_MEDIA_INVALID', 400, 'A post has 1–4 images or exactly 1 video, never mixed');
        }
      }

      const post = await tx.post.create({
        data: { authorId: viewer.id, kind: PostKind.POST, body },
        select: { id: true },
      });

      if (ids.length > 0) {
        // One conditional UPDATE sets post_id and position together (the CHECK
        // `(post_id IS NULL) = (position IS NULL)` forbids setting them in two steps). Position is
        // the index in the request. A concurrent attach makes count < ids.length → 409, rollback.
        const count = await tx.$executeRaw`
          UPDATE media
             SET post_id = ${post.id},
                 position = array_position(${ids}::uuid[], id) - 1
           WHERE id = ANY(${ids}::uuid[])
             AND owner_id = ${viewer.id}
             AND post_id IS NULL`;
        if (count !== ids.length) {
          throw new AppError('MEDIA_ALREADY_ATTACHED', 409, 'Media is already attached to a post');
        }
      }
      return post.id;
    });

    return this.findOne(postId, viewer);
  }

  /**
   * GET /feed/home (CLAUDE.md §4.5): kind POST by people I follow + me, visible (or mine), active
   * authors only, id DESC with an id cursor. One findMany per page.
   */
  async homeFeed(viewer: AuthUser, query: CursorQueryDto): Promise<FeedPage> {
    const limit = query.limit ?? HOME_FEED_DEFAULT_LIMIT;
    const rows = await this.prisma.post.findMany({
      where: {
        kind: PostKind.POST,
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
        author: {
          status: 'ACTIVE',
          OR: [{ id: viewer.id }, { followers: { some: { followerId: viewer.id } } }],
        },
        OR: [{ moderationState: ModerationState.VISIBLE }, { authorId: viewer.id }],
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: postCardSelect(viewer.id),
    });
    const page = rows.slice(0, limit);
    return {
      items: page.map((r) => toPostCard(r, viewer)),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    };
  }

  /** GET /posts/:id: visible, or mine, or I am an admin. Otherwise 404. */
  async findOne(id: number, viewer: AuthUser): Promise<PostCard> {
    if (id > INT_MAX) throw notFound();
    const row = await this.prisma.post.findUnique({ where: { id }, select: postCardSelect(viewer.id) });
    if (!row || !canView(row, viewer)) throw notFound();
    return toPostCard(row, viewer);
  }

  /** GET /posts/:id/public: visible posts by active authors only, without the *ByMe fields. */
  async findPublic(id: number): Promise<PostCard> {
    if (id > INT_MAX) throw notFound();
    const row = await this.prisma.post.findUnique({ where: { id }, select: postCardSelect(0) });
    if (!row || !canView(row, null)) throw notFound();
    return toPostCard(row, null);
  }

  /**
   * DELETE /posts/:id: author only (admins hide instead). Reposts, likes, comments, media rows and
   * reports go by FK cascade. The media file names are read BEFORE the delete (the cascade removes
   * the rows) and the files are deleted only AFTER the delete has committed.
   */
  async remove(id: number, viewer: AuthUser): Promise<void> {
    if (id > INT_MAX) throw notFound();
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true,
        moderationState: true,
        author: { select: { status: true } },
        media: { select: { fileName: true } },
      },
    });
    if (!post || !canView(post, viewer)) throw notFound();
    if (post.authorId !== viewer.id) throw new AppError('FORBIDDEN', 403, 'Only the author can delete a post');

    // One statement = one transaction. The author condition makes it safe against a race.
    const { count } = await this.prisma.post.deleteMany({ where: { id, authorId: viewer.id } });
    if (count !== 1) throw notFound();

    for (const { fileName } of post.media) {
      await rm(join(MEDIA_DIR, fileName), { force: true }).catch((e: unknown) =>
        this.logger.warn(`Could not delete ${fileName}: ${e instanceof Error ? e.message : String(e)}`),
      );
    }
  }
}
