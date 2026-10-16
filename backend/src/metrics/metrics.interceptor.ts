import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { METRICS_IGNORED_PATHS, MetricsService } from './metrics.service';

/** The subset of the Express request the interceptor reads. */
interface MetricsRequest {
  method: string;
  path: string;
  route?: { path: string };
}

interface MetricsResponse {
  statusCode: number;
}

const NS_PER_SECOND = 1e9;

/**
 * Records every HTTP request's method, matched route, status and duration.
 * Uses the Express route template (`/vault/:id`) so label cardinality stays bounded.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<MetricsRequest>();
    if (METRICS_IGNORED_PATHS.has(req.path)) {
      return next.handle();
    }

    const method = req.method;
    const route = req.route?.path ?? req.path;
    const startedAt = process.hrtime.bigint();
    const elapsedSeconds = (): number =>
      Number(process.hrtime.bigint() - startedAt) / NS_PER_SECOND;

    return next.handle().pipe(
      tap({
        complete: () => {
          const res = httpContext.getResponse<MetricsResponse>();
          this.metrics.record(method, route, res.statusCode, elapsedSeconds());
        },
        error: (error: unknown) => {
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          this.metrics.record(method, route, status, elapsedSeconds());
        },
      }),
    );
  }
}
