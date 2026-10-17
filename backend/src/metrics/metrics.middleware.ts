import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { METRICS_IGNORED_PATHS, MetricsService } from './metrics.service';

/** Label used when no Express route matched (404s, scanner noise). */
export const UNMATCHED_ROUTE = 'unmatched';

/**
 * Records one observation per HTTP request on response finish. A middleware
 * (not an interceptor) so that guard rejections (401/429) and unmatched 404s
 * are counted too; interceptors never see those.
 */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // originalUrl, not req.path: inside a mounted middleware Express rewrites
    // req.path relative to the mount point.
    const path = req.originalUrl.split('?')[0];
    if (METRICS_IGNORED_PATHS.has(path)) {
      next();
      return;
    }

    const started = process.hrtime.bigint();
    res.once('finish', () => {
      // req.route is set by Express once a handler matched; by 'finish' it is
      // the route template (bounded cardinality), e.g. "/vault/:id".
      const template = (req.route as { path?: string } | undefined)?.path;
      // Nest answers unknown paths through a wildcard catch-all route whose
      // template contains '*'; fold those into one bounded label.
      const route =
        template && !template.includes('*') ? template : UNMATCHED_ROUTE;
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;
      this.metrics.record(req.method, route, res.statusCode, seconds);
    });
    next();
  }
}
