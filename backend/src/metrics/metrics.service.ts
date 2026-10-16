import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from '@prometheus-io/client';
import * as http from 'node:http';
import { EnvVars } from '../config/env.validation';
import { HealthService } from '../health/health.service';

/** Request paths the HTTP interceptor never records (probes and the scrape endpoint). */
export const METRICS_IGNORED_PATHS: ReadonlySet<string> = new Set([
  '/metrics',
  '/health',
  '/health/live',
  '/health/ready',
]);

/** How often the `mongo_up` gauge re-pings Mongo. */
export const MONGO_GAUGE_INTERVAL_MS = 10_000;

export type HttpLabel = 'method' | 'route' | 'status';

/**
 * Owns the Prometheus registry and serves it on a dedicated port
 * (`METRICS_PORT`) so the scrape endpoint never shares the app listener.
 */
@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  readonly registry = new Registry();

  readonly httpRequestsTotal: Counter<HttpLabel>;
  readonly httpRequestDuration: Histogram<HttpLabel>;
  readonly mongoUp: Gauge;

  private timer: NodeJS.Timeout | undefined;
  private server: http.Server | undefined;

  constructor(
    private readonly health: HealthService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests handled, by method, route and status',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds, by method, route and status',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.mongoUp = new Gauge({
      name: 'mongo_up',
      help: '1 when the Mongo ping succeeds',
      registers: [this.registry],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.refreshMongoGauge();
    this.timer = setInterval(() => {
      void this.refreshMongoGauge();
    }, MONGO_GAUGE_INTERVAL_MS);
    this.timer.unref();

    await this.listen(this.config.get('METRICS_PORT', { infer: true }));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    const server = this.server;
    this.server = undefined;
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        server.closeAllConnections();
      });
    }
  }

  /** Port the metrics server is listening on; `undefined` before init or after destroy. */
  get boundPort(): number | undefined {
    const address = this.server?.address();
    return address && typeof address === 'object' ? address.port : undefined;
  }

  /** Pings Mongo and mirrors the result into the `mongo_up` gauge. */
  async refreshMongoGauge(): Promise<void> {
    const { ok } = await this.health.checkMongo();
    this.mongoUp.set(ok ? 1 : 0);
  }

  /** Records one completed HTTP request. */
  record(
    method: string,
    route: string,
    status: number,
    durationSeconds: number,
  ): void {
    const labels = { method, route, status: String(status) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }

  private listen(port: number): Promise<void> {
    const server = http.createServer((req, res) => {
      void this.handle(req, res);
    });
    this.server = server;

    return new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '0.0.0.0', () => {
        server.off('error', reject);
        resolve();
      });
    });
  }

  private async handle(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const path = req.url?.split('?')[0];
    if (req.method !== 'GET' || path !== '/metrics') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    try {
      const body = await this.registry.metrics();
      res.writeHead(200, { 'Content-Type': this.registry.contentType });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(err instanceof Error ? err.message : 'metrics collection failed');
    }
  }
}
