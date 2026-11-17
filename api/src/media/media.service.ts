import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { MediaKind } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdirSync, type Dirent } from 'node:fs';
import { readdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { detectFileType, readImageSize } from './magic-bytes';
import { probeMp4 } from './mp4-probe';

/** api/uploads/media: served at /media. The API runs with `api/` as its working directory. */
export const MEDIA_DIR = join(process.cwd(), 'uploads', 'media');
export const AVATARS_DIR = join(MEDIA_DIR, 'avatars');

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_MAX_MS = 60_000;

const HOUR = 60 * 60 * 1000;
const PENDING_TTL_MS = 24 * HOUR;
/** Grace period for files without a row: covers an upload between its rename and its INSERT. */
const UNTRACKED_GRACE_MS = HOUR;

const IMAGE_TYPES = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
} as const;

export class MediaResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '/media/5a1a3ed1-0000-4000-8000-000000000001.png' })
  url!: string;

  @ApiProperty({ enum: MediaKind })
  kind!: MediaKind;

  @ApiProperty({ type: Number, nullable: true, description: 'Display width (after EXIF/track rotation)' })
  width!: number | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Display height (after EXIF/track rotation)' })
  height!: number | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Videos only' })
  durationMs!: number | null;

  @ApiProperty()
  sizeBytes!: number;
}

export interface SweepResult {
  pendingRows: number;
  untrackedFiles: number;
  tmpFiles: number;
}

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private sweeping: Promise<SweepResult> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    mkdirSync(AVATARS_DIR, { recursive: true });
    // Non-blocking: boot does not wait for the sweep.
    void this.sweepOrphans().catch((e: unknown) =>
      this.logger.error(`Media sweep failed: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  /** Validates a Multer-saved image by its real type, renames it to <uuid>.<ext> and inserts a pending row. */
  async saveImage(file: Express.Multer.File, ownerId: number): Promise<MediaResponse> {
    const type = await detectFileType(file.path);
    if (type === null || type === 'isobmff') throw unsupported('Not a JPEG, PNG or WebP image');
    let size;
    try {
      size = await readImageSize(file.path, type);
    } catch (e) {
      throw unsupported(`Unreadable ${type} header: ${(e as Error).message}`);
    }
    const { ext, mime } = IMAGE_TYPES[type];
    return this.store(file, ownerId, {
      kind: MediaKind.IMAGE,
      ext,
      mimeType: mime,
      width: size.width,
      height: size.height,
      durationMs: null,
    });
  }

  /** Validates a Multer-saved video (ISO-BMFF, ≤ 60 s, H.264), then stores it as <uuid>.mp4. */
  async saveVideo(file: Express.Multer.File, ownerId: number): Promise<MediaResponse> {
    if ((await detectFileType(file.path)) !== 'isobmff') throw unsupported('Not an MP4/MOV video');
    let info;
    try {
      info = await probeMp4(file.path);
    } catch (e) {
      throw unsupported(`Unreadable video: ${(e as Error).message}`);
    }
    if (info.durationMs > VIDEO_MAX_MS) {
      throw new AppError('VIDEO_TOO_LONG', 422, `Video is ${info.durationMs} ms; the limit is ${VIDEO_MAX_MS} ms`);
    }
    if (info.codec !== 'avc1') {
      throw new AppError(
        'VIDEO_CODEC_UNSUPPORTED',
        422,
        `Video codec ${info.codec} is not supported; use H.264 (avc1)`,
      );
    }
    return this.store(file, ownerId, {
      kind: MediaKind.VIDEO,
      ext: 'mp4',
      mimeType: 'video/mp4',
      width: info.width,
      height: info.height,
      durationMs: info.durationMs,
    });
  }

  private async store(
    file: Express.Multer.File,
    ownerId: number,
    meta: { kind: MediaKind; ext: string; mimeType: string; width: number; height: number; durationMs: number | null },
  ): Promise<MediaResponse> {
    const id = randomUUID();
    const fileName = `${id}.${meta.ext}`;
    const finalPath = join(MEDIA_DIR, fileName);
    await rename(file.path, finalPath);
    // From here on, RemoveUploadOnError deletes the renamed file if the INSERT fails.
    file.path = finalPath;

    const row = await this.prisma.media.create({
      data: {
        id,
        ownerId,
        kind: meta.kind,
        fileName,
        mimeType: meta.mimeType,
        sizeBytes: file.size,
        width: meta.width,
        height: meta.height,
        durationMs: meta.durationMs,
      },
    });
    return {
      id: row.id,
      url: `/media/${row.fileName}`,
      kind: row.kind,
      width: row.width,
      height: row.height,
      durationMs: row.durationMs,
      sizeBytes: row.sizeBytes,
    };
  }

  /**
   * Deletes pending media rows older than 24 h with their files, files in uploads/media with no row
   * (older than 1 h), and `tmp-*` files older than 1 h. `avatars/` is never touched.
   * Concurrent calls share one run.
   */
  sweepOrphans(): Promise<SweepResult> {
    this.sweeping ??= this.runSweep().finally(() => {
      this.sweeping = null;
    });
    return this.sweeping;
  }

  private async runSweep(): Promise<SweepResult> {
    const now = Date.now();
    const result: SweepResult = { pendingRows: 0, untrackedFiles: 0, tmpFiles: 0 };

    const stale = await this.prisma.media.findMany({
      where: { postId: null, createdAt: { lt: new Date(now - PENDING_TTL_MS) } },
      select: { id: true, fileName: true },
    });
    for (const m of stale) {
      // Conditional delete: a post may have attached it since the SELECT.
      const { count } = await this.prisma.media.deleteMany({ where: { id: m.id, postId: null } });
      if (count === 1) {
        await rm(join(MEDIA_DIR, m.fileName), { force: true });
        result.pendingRows++;
      }
    }

    const entries: Dirent[] = await readdir(MEDIA_DIR, { withFileTypes: true }).catch(() => []);
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);
    const tracked = new Set(
      (
        await this.prisma.media.findMany({
          where: { fileName: { in: files.filter((f) => !f.startsWith('tmp-')) } },
          select: { fileName: true },
        })
      ).map((m) => m.fileName),
    );
    for (const name of files) {
      if (tracked.has(name)) continue;
      const path = join(MEDIA_DIR, name);
      const info = await stat(path).catch(() => null);
      if (!info) continue;
      const isTmp = name.startsWith('tmp-');
      if (now - info.mtimeMs < (isTmp ? HOUR : UNTRACKED_GRACE_MS)) continue;
      await rm(path, { force: true });
      if (isTmp) result.tmpFiles++;
      else result.untrackedFiles++;
    }

    this.logger.log(
      `Media sweep: ${result.pendingRows} pending rows, ${result.untrackedFiles} untracked files, ${result.tmpFiles} tmp files removed`,
    );
    return result;
  }
}

const unsupported = (message: string) => new AppError('MEDIA_TYPE_UNSUPPORTED', 415, message);
