import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EnvVars } from '../config/env.validation';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check (alias of liveness)' })
  @ApiResponse({ status: 200, description: 'Process is running' })
  check() {
    return { status: 'ok' };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe: process is up' })
  @ApiResponse({ status: 200, description: 'Process is running' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe: Mongo reachable' })
  @ApiResponse({ status: 200, description: 'Mongo ping succeeded' })
  @ApiResponse({
    status: 503,
    description: 'Mongo unreachable or readiness disabled by config',
  })
  async ready() {
    if (this.config.get('BREAK_READINESS', { infer: true })) {
      throw new ServiceUnavailableException({
        status: 'error',
        reason: 'readiness disabled by config',
      });
    }

    const { ok, latencyMs } = await this.health.checkMongo();
    if (!ok) {
      throw new ServiceUnavailableException({ status: 'error', mongo: 'down' });
    }
    return { status: 'ok', mongo: 'up', latencyMs };
  }
}
