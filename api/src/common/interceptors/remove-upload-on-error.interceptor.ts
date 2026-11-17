import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { rm } from 'node:fs/promises';
import { catchError, Observable, throwError } from 'rxjs';

/**
 * Multer writes the upload to disk BEFORE any of our checks (magic bytes, probe, DB insert) run,
 * so every failed request would otherwise leave a file behind. This interceptor wraps the
 * FileInterceptor (list it first in @UseInterceptors) and deletes `req.file.path` on any error.
 * The service updates `file.path` after it renames the temp file, so the renamed file is
 * the one deleted when a later step (e.g. the DB insert) fails.
 */
@Injectable()
export class RemoveUploadOnError implements NestInterceptor {
  private readonly logger = new Logger(RemoveUploadOnError.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      catchError((err: unknown) => {
        const path = req.file?.path;
        if (!path) return throwError(() => err);
        return new Observable<never>((subscriber) => {
          rm(path, { force: true })
            .catch((e: unknown) => this.logger.warn(`Could not delete ${path}: ${String(e)}`))
            .finally(() => subscriber.error(err));
        });
      }),
    );
  }
}
