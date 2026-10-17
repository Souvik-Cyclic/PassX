import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';

// MetricsMiddleware is mounted on the raw Express app in app.setup.ts so that
// requests with no matching route (404s) are counted; Nest-bound middleware
// only runs for routes Nest knows about.
@Module({
  imports: [HealthModule],
  providers: [MetricsService, MetricsMiddleware],
  exports: [MetricsService, MetricsMiddleware],
})
export class MetricsModule {}
