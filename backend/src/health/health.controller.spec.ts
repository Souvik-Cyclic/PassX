import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = { checkMongo: jest.fn() };
  const configService = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(false);
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: healthService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    controller = module.get(HealthController);
  });

  it('GET /health reports ok', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
  });

  it('GET /health/live reports ok', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  describe('GET /health/ready', () => {
    it('reports mongo up with latency when the check passes', async () => {
      healthService.checkMongo.mockResolvedValue({ ok: true, latencyMs: 7 });

      await expect(controller.ready()).resolves.toEqual({
        status: 'ok',
        mongo: 'up',
        latencyMs: 7,
      });
    });

    it('throws 503 with mongo down when the check fails', async () => {
      healthService.checkMongo.mockResolvedValue({
        ok: false,
        latencyMs: 1500,
      });

      const err = await controller.ready().catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect((err as ServiceUnavailableException).getResponse()).toEqual({
        status: 'error',
        mongo: 'down',
      });
    });

    it('throws 503 without calling the service when BREAK_READINESS is true', async () => {
      configService.get.mockReturnValue(true);

      const err = await controller.ready().catch((e: unknown) => e);

      expect(configService.get).toHaveBeenCalledWith('BREAK_READINESS', {
        infer: true,
      });
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect((err as ServiceUnavailableException).getResponse()).toEqual({
        status: 'error',
        reason: 'readiness disabled by config',
      });
      expect(healthService.checkMongo).not.toHaveBeenCalled();
    });
  });
});
