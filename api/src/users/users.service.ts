import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Role, User, UserStatus } from '@prisma/client';
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
}
