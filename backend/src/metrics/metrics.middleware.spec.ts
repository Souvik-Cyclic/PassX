import { EventEmitter } from 'events';
import type { NextFunction, Request, Response } from 'express';
import { MetricsMiddleware, UNMATCHED_ROUTE } from './metrics.middleware';
import { MetricsService } from './metrics.service';

class FakeResponse extends EventEmitter {
  statusCode = 200;
}

const request = (path: string, route?: string): Request =>
  ({
    method: 'GET',
    originalUrl: `${path}?x=1`,
    path: '/',
    route: route ? { path: route } : undefined,
  }) as unknown as Request;

describe('MetricsMiddleware', () => {
  const record = jest.fn<void, Parameters<MetricsService['record']>>();
  const middleware = new MetricsMiddleware({
    record,
  } as unknown as MetricsService);
  let next: jest.Mock<void, Parameters<NextFunction>>;

  beforeEach(() => {
    record.mockClear();
    next = jest.fn<void, Parameters<NextFunction>>();
  });

  it('records method, route template, status and duration on finish', () => {
    const res = new FakeResponse();
    const req = request('/vault/6ad4', '/vault/:id');
    middleware.use(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();

    res.statusCode = 200;
    res.emit('finish');

    expect(record).toHaveBeenCalledTimes(1);
    const [method, route, status, seconds] = record.mock.calls[0];
    expect([method, route, status]).toEqual(['GET', '/vault/:id', 200]);
    expect(seconds).toBeGreaterThanOrEqual(0);
  });

  it('labels requests that matched no route as unmatched', () => {
    const res = new FakeResponse();
    middleware.use(request('/nope'), res as unknown as Response, next);
    res.statusCode = 404;
    res.emit('finish');
    expect(record).toHaveBeenCalledWith(
      'GET',
      UNMATCHED_ROUTE,
      404,
      expect.any(Number),
    );
  });

  it('folds the framework catch-all template into unmatched', () => {
    const res = new FakeResponse();
    middleware.use(
      request('/nope', '{/*splat}'),
      res as unknown as Response,
      next,
    );
    res.statusCode = 404;
    res.emit('finish');
    expect(record).toHaveBeenCalledWith(
      'GET',
      UNMATCHED_ROUTE,
      404,
      expect.any(Number),
    );
  });

  it('counts guard rejections', () => {
    const res = new FakeResponse();
    middleware.use(
      request('/vault', '/vault'),
      res as unknown as Response,
      next,
    );
    res.statusCode = 401;
    res.emit('finish');
    expect(record).toHaveBeenCalledWith(
      'GET',
      '/vault',
      401,
      expect.any(Number),
    );
  });

  it('skips probe and metrics paths entirely', () => {
    for (const p of ['/metrics', '/health', '/health/live', '/health/ready']) {
      const res = new FakeResponse();
      middleware.use(request(p, p), res as unknown as Response, next);
      res.emit('finish');
    }
    expect(record).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(4);
  });
});
