import { Controller, HttpCode, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, type MulterModuleOptions } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { AppError, ErrorResponse } from '../common/errors';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RemoveUploadOnError } from '../common/interceptors/remove-upload-on-error.interceptor';
import { IMAGE_MAX_BYTES, MEDIA_DIR, MediaResponse, MediaService, VIDEO_MAX_BYTES } from './media.service';

/** Multer saves to uploads/media/tmp-<uuid>; the service renames it once the real type is known. */
const uploadOptions = (fileSize: number): MulterModuleOptions => ({
  storage: diskStorage({
    destination: MEDIA_DIR,
    filename: (_req, _file, cb) => cb(null, `tmp-${randomUUID()}`),
  }),
  limits: { fileSize, files: 1 },
});

const fileBody = (description: string) => ({
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary', description } },
  },
});

const requireFile = (file: Express.Multer.File | undefined): Express.Multer.File => {
  if (!file) {
    throw new AppError('VALIDATION_FAILED', 400, 'A file is required in the "file" field', [
      { field: 'file', constraints: ['required'] },
    ]);
  }
  return file;
};

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiConsumes('multipart/form-data')
@ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (no file in the "file" field)' })
@ApiResponse({ status: 401, type: ErrorResponse, description: 'UNAUTHENTICATED' })
@ApiResponse({ status: 403, type: ErrorResponse, description: 'ACCOUNT_SUSPENDED' })
@ApiResponse({ status: 413, type: ErrorResponse, description: 'MEDIA_TOO_LARGE' })
@ApiResponse({ status: 415, type: ErrorResponse, description: 'MEDIA_TYPE_UNSUPPORTED (real type from magic bytes)' })
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('images')
  @HttpCode(201)
  // RemoveUploadOnError first, so it wraps FileInterceptor and sees every later error.
  @UseInterceptors(RemoveUploadOnError, FileInterceptor('file', uploadOptions(IMAGE_MAX_BYTES)))
  @ApiBody(fileBody('JPEG, PNG or WebP, at most 5 MB'))
  @ApiResponse({ status: 201, type: MediaResponse, description: 'Pending media (not attached to a post yet)' })
  uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<MediaResponse> {
    return this.media.saveImage(requireFile(file), user.id);
  }

  @Post('videos')
  @HttpCode(201)
  @UseInterceptors(RemoveUploadOnError, FileInterceptor('file', uploadOptions(VIDEO_MAX_BYTES)))
  @ApiBody(fileBody('MP4/MOV with H.264 (avc1) video, at most 60 s and 50 MB. Stored and served as .mp4'))
  @ApiResponse({ status: 201, type: MediaResponse, description: 'Pending media (not attached to a post yet)' })
  @ApiResponse({ status: 422, type: ErrorResponse, description: 'VIDEO_TOO_LONG | VIDEO_CODEC_UNSUPPORTED' })
  uploadVideo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<MediaResponse> {
    return this.media.saveVideo(requireFile(file), user.id);
  }
}
