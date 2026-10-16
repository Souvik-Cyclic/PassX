import {
  CallHandler,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

interface FakeRequest {
  method: string;
  path: string;
  route?: { path: string };
}

function fakeContext(
  req: FakeRequest,
  statusCode = 200,
  type = 'http',
): ExecutionContext {
  const ctx = {
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ statusCode }),
    }),
  };
  return ctx as unknown as ExecutionContext;
}

function handler(result: CallHandler['handle']): CallHandler {
  return { handle: result };
}

describe('MetricsInterceptor', () => {
  const record = jest.fn<void, Parameters<MetricsService['record']>>();
  const metrics = { record } as unknown as MetricsService;
  let interceptor: MetricsInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new MetricsInterceptor(metrics);
  });

  it('records method, route, status and duration on success', async () => {
    const ctx = fakeContext({
      method: 'GET',
      path: '/vault/abc',
      route: { path: '/vault/:id' },
    });

    const result = await lastValueFrom(
      interceptor.intercept(
        ctx,
        handler(() => of('ok')),
      ),
    );

    expect(result).toBe('ok');
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      'GET',
      '/vault/:id',
      200,
      expect.any(Number),
    );
    const duration = record.mock.calls[0][3];
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThan(5);
  });

  it('falls back to req.path when there is no matched route', async () => {
    const ctx = fakeContext({ method: 'POST', path: '/unknown' }, 201);

    await lastValueFrom(
      interceptor.intercept(
        ctx,
        handler(() => of(1)),
      ),
    );

    expect(record).toHaveBeenCalledWith(
      'POST',
      '/unknown',
      201,
      expect.any(Number),
    );
  });

  it.each(['/metrics', '/health', '/health/live', '/health/ready'])(
    'skips %s',
    async (path) => {
      const ctx = fakeContext({ method: 'GET', path, route: { path } });

      const result = await lastValueFrom(
        interceptor.intercept(
          ctx,
          handler(() => of('ok')),
        ),
      );

      expect(result).toBe('ok');
      expect(record).not.toHaveBeenCalled();
    },
  );

  it('records the HttpException status and rethrows', async () => {
    const ctx = fakeContext({
      method: 'GET',
      path: '/vault/x',
      route: { path: '/vault/:id' },
    });
    const error = new NotFoundException();

    await expect(
      lastValueFrom(
        interceptor.intercept(
          ctx,
          handler(() => throwError(() => error)),
        ),
      ),
    ).rejects.toBe(error);

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      'GET',
      '/vault/:id',
      404,
      expect.any(Number),
    );
  });

  it('records 500 for a non-HTTP error and rethrows', async () => {
    const ctx = fakeContext({
      method: 'DELETE',
      path: '/vault/x',
      route: { path: '/vault/:id' },
    });
    const error = new Error('boom');

    await expect(
      lastValueFrom(
        interceptor.intercept(
          ctx,
          handler(() => throwError(() => error)),
        ),
      ),
    ).rejects.toBe(error);

    expect(record).toHaveBeenCalledWith(
      'DELETE',
      '/vault/:id',
      500,
      expect.any(Number),
    );
  });

  it('ignores non-HTTP execution contexts', async () => {
    const ctx = fakeContext({ method: 'GET', path: '/x' }, 200, 'rpc');

    await lastValueFrom(
      interceptor.intercept(
        ctx,
        handler(() => of('ok')),
      ),
    );

    expect(record).not.toHaveBeenCalled();
  });
});
