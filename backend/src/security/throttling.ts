import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Routes that probes and scrapers hit constantly; never rate limit them. */
export const THROTTLE_EXEMPT_PATHS = new Set([
  '/health',
  '/health/live',
  '/health/ready',
  '/metrics',
]);

export const isThrottleExempt = (context: ExecutionContext): boolean =>
  THROTTLE_EXEMPT_PATHS.has(context.switchToHttp().getRequest<Request>().path);

/** Tighter limit for credential endpoints: 10 attempts per minute per IP. */
export const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
