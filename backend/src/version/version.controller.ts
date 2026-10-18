import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EnvVars } from '../config/env.validation';

/** Build and runtime identity of the running backend instance. */
export interface VersionInfo {
  /** Git commit SHA the image was built from (`APP_COMMIT`). */
  commit: string;
  /** Container image tag (`APP_IMAGE_TAG`). */
  imageTag: string;
  /** ISO timestamp of the image build (`APP_BUILD_TIME`). */
  buildTime: string;
  /** URL of the CI pipeline run that produced the image (`APP_PIPELINE_URL`). */
  pipelineUrl: string;
  /** Kubernetes pod name (`POD_NAME`). */
  pod: string;
  /** Kubernetes node name (`NODE_NAME`). */
  node: string;
  /** ISO timestamp captured when this process instantiated the controller. */
  startedAt: string;
}

@ApiTags('Version')
@Controller('version')
export class VersionController {
  private readonly startedAt = new Date().toISOString();

  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  @Get()
  @ApiOperation({ summary: 'Build and runtime identity of this instance' })
  @ApiResponse({
    status: 200,
    description: 'Version information',
    schema: {
      example: {
        commit: '9f2c1e4a7b3d5c6e8f0a1b2c3d4e5f6a7b8c9d0e',
        imageTag: 'ghcr.io/passx/backend:9f2c1e4',
        buildTime: '2026-10-18T10:00:00Z',
        pipelineUrl: 'https://github.com/passx/passx/actions/runs/123',
        pod: 'passx-backend-7d9f8b6c5-xk2lp',
        node: 'worker-1',
        startedAt: '2026-10-18T10:05:12.345Z',
      } satisfies VersionInfo,
    },
  })
  getVersion(): VersionInfo {
    return {
      commit: this.config.get('APP_COMMIT', { infer: true }),
      imageTag: this.config.get('APP_IMAGE_TAG', { infer: true }),
      buildTime: this.config.get('APP_BUILD_TIME', { infer: true }),
      pipelineUrl: this.config.get('APP_PIPELINE_URL', { infer: true }),
      pod: this.config.get('POD_NAME', { infer: true }),
      node: this.config.get('NODE_NAME', { infer: true }),
      startedAt: this.startedAt,
    };
  }
}
