import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const ping = jest.fn();
  const connection = { readyState: 1, db: { admin: () => ({ ping }) } };
  let service: HealthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getConnectionToken(), useValue: connection },
      ],
    }).compile();
    service = module.get(HealthService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with mongo marked down', () => {
    expect(service.isMongoUp()).toBe(false);
  });

  it('reports ok with a non-negative latency when ping resolves', async () => {
    ping.mockResolvedValue({ ok: 1 });

    const result = await service.checkMongo();

    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(service.isMongoUp()).toBe(true);
  });

  it('reports not ok when ping rejects', async () => {
    ping.mockRejectedValue(new Error('connection refused'));

    await expect(service.checkMongo()).resolves.toMatchObject({ ok: false });
    expect(service.isMongoUp()).toBe(false);
  });

  it('reports not ok within the timeout when ping never resolves', async () => {
    jest.useFakeTimers();
    ping.mockReturnValue(new Promise(() => undefined));

    const pending = service.checkMongo();
    await jest.advanceTimersByTimeAsync(1500);

    await expect(pending).resolves.toMatchObject({ ok: false });
    expect(service.isMongoUp()).toBe(false);
  });

  it('reports not ok when the connection has no db', async () => {
    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getConnectionToken(), useValue: { db: undefined } },
      ],
    }).compile();

    await expect(module.get(HealthService).checkMongo()).resolves.toMatchObject(
      { ok: false },
    );
    expect(ping).not.toHaveBeenCalled();
  });

  it('isMongoUp reflects the most recent check', async () => {
    ping.mockResolvedValueOnce({ ok: 1 });
    await service.checkMongo();
    expect(service.isMongoUp()).toBe(true);

    ping.mockRejectedValueOnce(new Error('down'));
    await service.checkMongo();
    expect(service.isMongoUp()).toBe(false);
  });
});
