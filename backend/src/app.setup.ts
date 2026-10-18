import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import type { EnvVars } from './config/env.validation';
import { MetricsMiddleware } from './metrics/metrics.middleware';
import { buildCorsOptions } from './security/cors';

/** Shared HTTP setup for main.ts and e2e tests, so tests run the prod pipeline. */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(ConfigService<EnvVars, true>);

  // Proxy hops trusted for X-Forwarded-For in req.ip; 0 never trusts it.
  (app as NestExpressApplication).set(
    'trust proxy',
    config.get('TRUST_PROXY', { infer: true }),
  );

  // CSP off: Swagger UI at /docs needs inline scripts. Other helmet headers stay on.
  app.use(helmet({ contentSecurityPolicy: false }));

  // On raw Express so 404s and guard rejections also reach http_requests_total.
  const metrics = app.get(MetricsMiddleware);
  app.use(metrics.use.bind(metrics));

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
