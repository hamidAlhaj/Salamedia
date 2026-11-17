import { HttpException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Stable error codes (CLAUDE.md §4.8). The web maps each one to an Arabic message. */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'ACCOUNT_SUSPENDED'
  | 'MEDIA_TOO_LARGE'
  | 'MEDIA_TYPE_UNSUPPORTED'
  | 'VIDEO_TOO_LONG'
  | 'VIDEO_CODEC_UNSUPPORTED'
  | 'REEL_REQUIRES_VIDEO'
  | 'REEL_NOT_VERTICAL'
  | 'MEDIA_NOT_OWNED'
  | 'MEDIA_ALREADY_ATTACHED'
  | 'POST_EMPTY'
  | 'POST_MEDIA_INVALID'
  | 'CANNOT_REPOST'
  | 'ALREADY_REPOSTED'
  | 'CANNOT_FOLLOW_SELF'
  | 'DM_REQUIRES_MUTUAL_FOLLOW'
  | 'NOT_A_MEMBER'
  | 'GROUP_FULL'
  | 'OWNER_CANNOT_LEAVE'
  | 'RATE_LIMITED'
  | 'INVALID_TRANSITION'
  | 'CANNOT_REPORT_OWN'
  | 'REPORT_ALREADY_OPEN'
  | 'CANNOT_SUSPEND'
  | 'INTERNAL_ERROR';

export interface FieldErrorDetail {
  field: string;
  constraints: string[];
}

export interface ErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/** An HttpException whose body is always `{ statusCode, code, message, details? }`. */
export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    status: number,
    message: string = code,
    details?: unknown,
  ) {
    const body: ErrorBody = { statusCode: status, code, message };
    if (details !== undefined) body.details = details;
    super(body, status);
  }
}

/** Swagger schema for every error response. */
export class ErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_FAILED' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({
    example: [{ field: 'username', constraints: ['matches'] }],
    description: 'Per-field details for VALIDATION_FAILED',
  })
  details?: unknown;
}
