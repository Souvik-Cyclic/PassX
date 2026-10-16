import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as http from 'node:http';
import { HealthService } from '../health/health.service';
import { MetricsService } from './metrics.service';

interface FakeResponse {
  status: number | undefined;
  contentType: string | undefined;
  body: string;
}

function get(url: string): Promise<FakeResponse> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            contentType: res.headers['content-type'],
            body,
          }),
        );
      })
      .on('error', reject);
  });
}

describe('MetricsService', () => {
  const checkMongo = jest.fn();
  const health = { checkMongo, isMongoUp: jest.fn() };
  const config = {
    get: jest.fn((key: string) =>
      key === 'METRICS_PORT'
        ? 0
        : key === 'METRICS_HOST'
          ? '127.0.0.1'
          : undefined,
    ),
  };
  let service: MetricsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    checkMongo.mockResolvedValue({ ok: true, latencyMs: 1 });
    const module = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: HealthService, useValue: health },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(MetricsService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('registers the http request counter on its own registry', async () => {
    await service.onModuleInit();

    expect(
      service.registry.getSingleMetric('http_requests_total'),
    ).toBeDefined();
    expect(
      service.registry.getSingleMetric('http_request_duration_seconds'),
    ).toBeDefined();
    expect(service.registry.getSingleMetric('mongo_up')).toBeDefined();
  });

  it('refreshes the mongo gauge once on init', async () => {
    await service.onModuleInit();

    expect(checkMongo).toHaveBeenCalledTimes(1);
    const text = await service.registry.getSingleMetricAsString('mongo_up');
    expect(text).toContain('mongo_up 1');
  });

  it('sets mongo_up to 1 when the ping succeeds and 0 when it fails', async () => {
    checkMongo.mockResolvedValueOnce({ ok: true, latencyMs: 1 });
    await service.refreshMongoGauge();
    expect(
      await service.registry.getSingleMetricAsString('mongo_up'),
    ).toContain('mongo_up 1');

    checkMongo.mockResolvedValueOnce({ ok: false, latencyMs: 1500 });
    await service.refreshMongoGauge();
    expect(
      await service.registry.getSingleMetricAsString('mongo_up'),
    ).toContain('mongo_up 0');
  });

  it('record increments the counter and observes the histogram', async () => {
    service.record('GET', '/vault', 200, 0.02);
    service.record('GET', '/vault', 200, 0.03);

    const text = await service.registry.metrics();
    expect(text).toContain(
      'http_requests_total{method="GET",route="/vault",status="200"} 2',
    );
    expect(text).toContain(
      'http_request_duration_seconds_count{method="GET",route="/vault",status="200"} 2',
    );
  });

  it('serves GET /metrics on the bound port', async () => {
    await service.onModuleInit();
    const port = service.boundPort;
    expect(port).toBeGreaterThan(0);

    const res = await get(`http://127.0.0.1:${port}/metrics`);

    expect(res.status).toBe(200);
    expect(res.contentType).toBe(service.registry.contentType);
    expect(res.body).toContain('http_requests_total');
    expect(res.body).toContain('mongo_up');
  });

  it('answers 404 for any other path', async () => {
    await service.onModuleInit();

    const res = await get(`http://127.0.0.1:${service.boundPort}/other`);

    expect(res.status).toBe(404);
  });

  it('closes the server and stops polling on destroy', async () => {
    await service.onModuleInit();
    const port = service.boundPort;

    await service.onModuleDestroy();

    expect(service.boundPort).toBeUndefined();
    await expect(get(`http://127.0.0.1:${port}/metrics`)).rejects.toMatchObject(
      { code: 'ECONNREFUSED' },
    );
  });

  it('polls the mongo gauge every 10 s until destroyed', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    try {
      await service.onModuleInit();
      expect(checkMongo).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(10_000);
      expect(checkMongo).toHaveBeenCalledTimes(2);

      await service.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(20_000);
      expect(checkMongo).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
