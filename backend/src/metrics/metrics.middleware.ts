import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { METRICS_IGNORED_PATHS, MetricsService } from './metrics.service';

/** Label used when no Express route matched (404s, scanner noise). */
export const UNMATCHED_ROUTE = 'unmatched';

/**
 * Counts each HTTP request on response finish. A middleware, not an interceptor,
 * so guard rejections (401/429) and unmatched 404s are counted too.
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // originalUrl, not req.path: Express rewrites req.path in mounted middleware.
    const path = req.originalUrl.split('?')[0];
    if (METRICS_IGNORED_PATHS.has(path)) {
      next();
      return;
    }

    const started = process.hrtime.bigint();
    res.once('finish', () => {
      // By 'finish', req.route holds the matched template, e.g. "/vault/:id".
      const template = (req.route as { path?: string } | undefined)?.path;
      // Nest's catch-all for unknown paths contains '*'; fold it into one label.
      const route =
        template && !template.includes('*') ? template : UNMATCHED_ROUTE;
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;
      this.metrics.record(req.method, route, res.statusCode, seconds);
    });
    next();
  }
}
