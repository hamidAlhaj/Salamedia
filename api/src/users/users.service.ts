import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Role, User, UserStatus } from '@prisma/client';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

/** Public URL of a stored avatar (`avatars/<file>` under /media). */
export const avatarUrl = (avatarPath: string | null): string | null =>
  avatarPath ? `/media/${avatarPath}` : null;

/** Another person, as anyone may see them. No email, role or suspension fields. */
export class PublicUser {
  @ApiProperty() id!: number;
  @ApiProperty({ example: 'layla' }) username!: string;
  @ApiProperty({ example: 'ليلى الحسن' }) name!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) bio!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: '/media/avatars/x.jpg' })
  avatarUrl!: string | null;
  @ApiProperty() createdAt!: Date;
}

/** The signed-in user themself. Never includes password_hash. */
export class SafeUser extends PublicUser {
  @ApiProperty({ example: 'layla@salamedia.test' }) email!: string;
  @ApiProperty({ enum: ['USER', 'ADMIN'] }) role!: Role;
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] }) status!: UserStatus;
}

/** GET /users/:username. Counts are computed (never stored) and cover visible content only. */
export class ProfileUser extends PublicUser {
  @ApiProperty() followersCount!: number;
  @ApiProperty() followingCount!: number;
  @ApiProperty({ description: 'Visible POST-kind posts (originals and reposts)' }) postsCount!: number;
  @ApiProperty({ description: 'Visible reels' }) reelsCount!: number;
  @ApiProperty() isMe!: boolean;
}

const SEARCH_LIMIT = 20;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatarUrl: avatarUrl(user.avatarPath),
      createdAt: user.createdAt,
    };
  }

  toSafeUser(user: User): SafeUser {
    return { ...this.toPublicUser(user), email: user.email, role: user.role, status: user.status };
  }

  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * A profile with its counts. Suspended users are 404 for non-admins. For non-admins the
   * follower/following counts skip suspended accounts, matching the lists (CLAUDE.md §4.4).
   * Two queries: the user with its filtered follow `_count`, then one groupBy over post kinds.
   */
  async getProfile(username: string, viewer: AuthUser): Promise<ProfileUser> {
    const isAdmin = viewer.role === 'ADMIN';
    const user = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: {
        _count: {
          select: {
            followers: { where: isAdmin ? {} : { follower: { status: 'ACTIVE' } } },
            following: { where: isAdmin ? {} : { followee: { status: 'ACTIVE' } } },
          },
        },
      },
    });
    if (!user || (user.status === 'SUSPENDED' && !isAdmin)) {
      throw new AppError('NOT_FOUND', 404, 'User not found');
    }

    const byKind = await this.prisma.post.groupBy({
      by: ['kind'],
      where: { authorId: user.id, moderationState: 'VISIBLE' },
      _count: { _all: true },
    });
    const count = (kind: 'POST' | 'REEL') => byKind.find((g) => g.kind === kind)?._count._all ?? 0;

    return {
      ...this.toPublicUser(user),
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: count('POST'),
      reelsCount: count('REEL'),
      isMe: user.id === viewer.id,
    };
  }

  /** Case-insensitive `contains` on username and name. Active users only. */
  async search(q: string): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { username: 'asc' },
      take: SEARCH_LIMIT,
    });
    return users.map((u) => this.toPublicUser(u));
  }
}
