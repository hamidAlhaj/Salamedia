import { ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'node:fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppError, FieldErrorDetail } from './common/errors';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AVATARS_DIR, MEDIA_DIR } from './media/media.service';

/** Flattens class-validator errors into `[{ field, constraints }]` (nested fields use dots). */
function toDetails(errors: ValidationError[], prefix = ''): FieldErrorDetail[] {
  return errors.flatMap((e) => {
    const field = prefix ? `${prefix}.${e.property}` : e.property;
    const own = e.constraints ? [{ field, constraints: Object.keys(e.constraints) }] : [];
    return [...own, ...toDetails(e.children ?? [], field)];
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppError('VALIDATION_FAILED', 400, 'Validation failed', toDetails(errors)),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const origins = (process.env.WEB_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // Uploaded media: UUID names never change, so cache for 30 days. `send` answers Range with 206.
  mkdirSync(AVATARS_DIR, { recursive: true });
  app.useStaticAssets(MEDIA_DIR, {
    prefix: '/media',
    immutable: true,
    maxAge: '30d',
    index: false,
    dotfiles: 'deny',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Salamedia API')
    .setVersion('0.4.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(Number(process.env.PORT ?? 4000));
}
void bootstrap();
