import type { IncomingMessage, ServerResponse } from 'http';
import { ConfigService } from '@nestjs/config';
import { buildPinoHttpOptions } from './logger.config';

const config = (overrides: Record<string, unknown> = {}) =>
  ({
    get: (key: string) =>
      ({ LOG_LEVEL: 'info', NODE_ENV: 'production', ...overrides })[key],
  }) as unknown as ConfigService;

const req = (url: string, headers: Record<string, string> = {}) =>
  ({ url, headers, id: 'req-1' }) as unknown as IncomingMessage;
const res = (statusCode: number) =>
  ({ statusCode, setHeader: jest.fn() }) as unknown as ServerResponse;

describe('buildPinoHttpOptions', () => {
  const options = buildPinoHttpOptions(config());
  const genReqId = options.genReqId as unknown as (
    req: IncomingMessage,
    res: ServerResponse,
  ) => string;
  const customLogLevel = options.customLogLevel as unknown as (
    req: IncomingMessage,
    res: ServerResponse,
    error?: Error,
  ) => string;
  const customProps = options.customProps as unknown as (
    req: IncomingMessage,
    res: ServerResponse,
  ) => Record<string, unknown>;

  it('uses the configured level and no pretty transport in production', () => {
    expect(options.level).toBe('info');
    expect(options.transport).toBeUndefined();
  });

  it('enables pino-pretty only in development', () => {
    const dev = buildPinoHttpOptions(config({ NODE_ENV: 'development' }));
    expect(dev.transport).toEqual({ target: 'pino-pretty' });
  });

  it('echoes a safe incoming request id and sets the response header', () => {
    const setHeader = jest.fn();
    const r = { statusCode: 200, setHeader } as unknown as ServerResponse;
    const id = genReqId(req('/x', { 'x-request-id': 'abc-1' }), r);
    expect(id).toBe('abc-1');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'abc-1');
  });

  it('logs healthy probe traffic at debug but failing probes at error', () => {
    expect(customLogLevel(req('/health/live'), res(200))).toBe('debug');
    expect(customLogLevel(req('/metrics'), res(200))).toBe('debug');
    expect(customLogLevel(req('/health/ready'), res(503))).toBe('error');
  });

  it('emits string level labels', () => {
    const fmt = options.formatters as { level: (l: string) => object };
    expect(fmt.level('info')).toEqual({ level: 'info' });
  });

  it('maps status codes to levels', () => {
    expect(customLogLevel(req('/vault'), res(200))).toBe('info');
    expect(customLogLevel(req('/vault'), res(404))).toBe('warn');
    expect(customLogLevel(req('/vault'), res(500))).toBe('error');
    expect(customLogLevel(req('/vault'), res(200), new Error('x'))).toBe(
      'error',
    );
  });

  it('adds requestId to every log line', () => {
    const props = customProps(req('/vault'), res(200));
    expect(props.requestId).toBe('req-1');
    expect(props).toHaveProperty('traceId');
  });

  it('redacts the authorization header', () => {
    expect(options.redact).toEqual(['req.headers.authorization']);
  });
});
