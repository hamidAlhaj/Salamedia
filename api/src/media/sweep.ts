/* `npm run media:sweep`: boots a Nest application context (no HTTP server) and runs the orphan sweep. */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MediaService } from './media.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  try {
    // Joins the sweep that MediaService.onModuleInit already started (single-flight).
    const result = await app.get(MediaService).sweepOrphans();
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
