import { isNoiseRequest, startTracing } from './tracing';

describe('startTracing', () => {
  it('is inert when no OTLP endpoint is configured', () => {
    expect(startTracing({})).toBeUndefined();
    expect(startTracing({ OTEL_EXPORTER_OTLP_ENDPOINT: '' })).toBeUndefined();
  });

  it('does not load the OpenTelemetry SDK when inert', () => {
    const loaded = Object.keys(require.cache).some((k) =>
      k.includes('@opentelemetry/sdk-node'),
    );
    expect(loaded).toBe(false);
  });

  it('starts an SDK when an endpoint is configured and shuts down cleanly', async () => {
    const sdk = startTracing({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:1',
      OTEL_SERVICE_NAME: 'passx-test',
      APP_COMMIT: 'abc123',
    });

    expect(sdk).toBeDefined();
    expect(typeof sdk?.shutdown).toBe('function');
    await expect(sdk!.shutdown()).resolves.toBeUndefined();
  }, 10_000);

  it('does not trace probe and scrape traffic', () => {
    expect(isNoiseRequest('/health')).toBe(true);
    expect(isNoiseRequest('/health/live')).toBe(true);
    expect(isNoiseRequest('/health/ready?x=1')).toBe(true);
    expect(isNoiseRequest('/metrics')).toBe(true);
    expect(isNoiseRequest('/vault')).toBe(false);
    expect(isNoiseRequest('/auth/login')).toBe(false);
    expect(isNoiseRequest(undefined)).toBe(false);
  });
});
