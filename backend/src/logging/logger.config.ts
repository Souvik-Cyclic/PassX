import type { IncomingMessage, ServerResponse } from 'http';
import { ConfigService } from '@nestjs/config';
import { trace } from '@opentelemetry/api';
import type { Options } from 'pino-http';
import type { EnvVars } from '../config/env.validation';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id';

/** Paths that are noisy and operational; logged at debug so info stays readable. */
const QUIET_PATHS = new Set([
  '/health',
  '/health/live',
  '/health/ready',
  '/metrics',
]);

const pathOf = (req: IncomingMessage): string => (req.url ?? '').split('?')[0];

export function buildPinoHttpOptions(
  config: ConfigService<EnvVars, true>,
): Options<IncomingMessage, ServerResponse> {
  const nodeEnv = config.get('NODE_ENV', { infer: true });

  return {
    level: config.get('LOG_LEVEL', { infer: true }),
    transport:
      nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
    // String levels ("info") so Loki and Grafana can filter without a mapping.
    formatters: { level: (label) => ({ level: label }) },
    redact: ['req.headers.authorization'],
    genReqId: (req, res) => {
      const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    customProps: (req) => ({
      requestId: req.id,
      traceId: trace.getActiveSpan()?.spanContext().traceId,
    }),
    customLogLevel: (req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (QUIET_PATHS.has(pathOf(req)) && res.statusCode < 400) return 'debug';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  };
}
