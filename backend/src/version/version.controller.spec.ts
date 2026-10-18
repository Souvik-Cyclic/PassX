import { ConfigService } from '@nestjs/config';
import { VersionController, VersionInfo } from './version.controller';

const configKeys = [
  'APP_COMMIT',
  'APP_IMAGE_TAG',
  'APP_BUILD_TIME',
  'APP_PIPELINE_URL',
  'POD_NAME',
  'NODE_NAME',
] as const;

function mockConfig(values: Record<string, string>) {
  const get = jest.fn((key: string) => values[key]);
  return { get, config: { get } as unknown as ConfigService };
}

describe('VersionController', () => {
  it('maps config keys onto the response body', () => {
    const values: Record<string, string> = {
      APP_COMMIT: 'abc123',
      APP_IMAGE_TAG: 'ghcr.io/passx/backend:abc123',
      APP_BUILD_TIME: '2026-10-18T10:00:00Z',
      APP_PIPELINE_URL: 'https://github.com/passx/passx/actions/runs/1',
      POD_NAME: 'backend-7d9f-xyz',
      NODE_NAME: 'worker-1',
    };
    const { get, config } = mockConfig(values);
    const controller = new VersionController(config);

    const body: VersionInfo = controller.getVersion();

    expect(Object.keys(body).sort()).toEqual(
      [
        'commit',
        'imageTag',
        'buildTime',
        'pipelineUrl',
        'pod',
        'node',
        'startedAt',
      ].sort(),
    );
    expect(body).toMatchObject({
      commit: 'abc123',
      imageTag: 'ghcr.io/passx/backend:abc123',
      buildTime: '2026-10-18T10:00:00Z',
      pipelineUrl: 'https://github.com/passx/passx/actions/runs/1',
      pod: 'backend-7d9f-xyz',
      node: 'worker-1',
    });
    expect(Number.isFinite(Date.parse(body.startedAt))).toBe(true);
    for (const key of configKeys) {
      expect(get).toHaveBeenCalledWith(key, { infer: true });
    }
  });

  it('reports unknown for every field when config has defaults', () => {
    const { config } = mockConfig(
      Object.fromEntries(configKeys.map((k) => [k, 'unknown'])),
    );
    const controller = new VersionController(config);

    const body = controller.getVersion();

    expect(body.commit).toBe('unknown');
    expect(body.imageTag).toBe('unknown');
    expect(body.buildTime).toBe('unknown');
    expect(body.pipelineUrl).toBe('unknown');
    expect(body.pod).toBe('unknown');
    expect(body.node).toBe('unknown');
  });

  it('captures startedAt once at construction', () => {
    const { config } = mockConfig(
      Object.fromEntries(configKeys.map((k) => [k, 'x'])),
    );
    const controller = new VersionController(config);

    const first = controller.getVersion().startedAt;
    const second = controller.getVersion().startedAt;

    expect(second).toBe(first);
  });
});
