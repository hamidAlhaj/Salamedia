import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ErrorBody, ErrorCode } from '../errors';

/** Default code for an HttpException that did not come from AppError. */
const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'MEDIA_TOO_LARGE',
  429: 'RATE_LIMITED',
};

/** Unique-violation (P2002) → stable code, by the column or constraint named in the error. */
const UNIQUE_CODES: [string, ErrorCode][] = [
  ['email', 'EMAIL_TAKEN'],
  ['username', 'USERNAME_TAKEN'],
];

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && 'code' in response) {
        return response as ErrorBody;
      }
      const message =
        typeof response === 'string'
          ? response
          : String((response as { message?: unknown }).message ?? exception.message);
      return { statusCode: status, code: CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR', message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = JSON.stringify(exception.meta?.target ?? '');
        const hit = UNIQUE_CODES.find(([needle]) => target.includes(needle));
        if (hit) return { statusCode: 409, code: hit[1], message: hit[1] };
      }
      if (exception.code === 'P2025') {
        return { statusCode: 404, code: 'NOT_FOUND', message: 'Not found' };
      }
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
  }
}
