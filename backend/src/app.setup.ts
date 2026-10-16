import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Applies every cross-cutting setting the HTTP app needs. Shared by main.ts and
 * the e2e harness so tests exercise the same pipeline production runs.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
