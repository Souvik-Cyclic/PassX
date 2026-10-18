import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';

// MetricsMiddleware is mounted on raw Express in app.setup.ts so 404s are
// counted; Nest middleware only runs on known routes.
@Module({
  imports: [HealthModule],
  providers: [MetricsService, MetricsMiddleware],
  exports: [MetricsService, MetricsMiddleware],
})
export class MetricsModule {}
