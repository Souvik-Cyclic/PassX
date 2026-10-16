import type { ExecutionContext } from '@nestjs/common';
import { AUTH_THROTTLE, isThrottleExempt } from './throttling';

const ctx = (path: string): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ path }) }),
  }) as unknown as ExecutionContext;

describe('throttling', () => {
  it('exempts probes and metrics', () => {
    for (const p of ['/health', '/health/live', '/health/ready', '/metrics']) {
      expect(isThrottleExempt(ctx(p))).toBe(true);
    }
  });

  it('throttles everything else', () => {
    expect(isThrottleExempt(ctx('/vault'))).toBe(false);
    expect(isThrottleExempt(ctx('/auth/login'))).toBe(false);
  });

  it('limits auth routes to 10 per minute', () => {
    expect(AUTH_THROTTLE).toEqual({ default: { limit: 10, ttl: 60_000 } });
  });
});
