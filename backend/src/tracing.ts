import type { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * Starts OpenTelemetry tracing when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 * Must run before any other module is imported so auto-instrumentation can
 * patch http, express, and mongoose. Returns undefined without loading the
 * OpenTelemetry packages when tracing is not configured, which keeps tests fast and offline.
 */
export function startTracing(
  env: NodeJS.ProcessEnv = process.env,
): NodeSDK | undefined {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint) {
    return undefined;
  }

  // Loaded lazily: the OpenTelemetry packages cost ~50 MB RSS and ~0.5 s at
  // startup, which pods without tracing should not pay.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { NodeSDK } =
    require('@opentelemetry/sdk-node') as typeof import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } =
    require('@opentelemetry/auto-instrumentations-node') as typeof import('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } =
    require('@opentelemetry/exporter-trace-otlp-grpc') as typeof import('@opentelemetry/exporter-trace-otlp-grpc');
  const { resourceFromAttributes } =
    require('@opentelemetry/resources') as typeof import('@opentelemetry/resources');
  const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } =
    require('@opentelemetry/semantic-conventions') as typeof import('@opentelemetry/semantic-conventions');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME ?? 'passx-backend',
      [ATTR_SERVICE_VERSION]: env.APP_COMMIT ?? 'unknown',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  process.once('SIGTERM', () => {
    void sdk.shutdown();
  });

  return sdk;
}
