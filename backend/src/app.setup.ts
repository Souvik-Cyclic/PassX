import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import type { EnvVars } from './config/env.validation';
import { buildCorsOptions } from './security/cors';

/**
 * Applies every cross-cutting setting the HTTP app needs. Shared by main.ts and
 * the e2e harness so tests exercise the same pipeline production runs.
 */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService<EnvVars, true>);

  // CSP is off because Swagger UI at /docs relies on inline scripts; every
  // other helmet header (nosniff, frameguard, HSTS, no x-powered-by) stays on.
  app.use(helmet({ contentSecurityPolicy: false }));

  const cors = buildCorsOptions(
    config.get('CORS_ORIGINS', { infer: true }),
    config.get('NODE_ENV', { infer: true }),
  );
  if (cors) {
    app.enableCors(cors);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  return app;
}
