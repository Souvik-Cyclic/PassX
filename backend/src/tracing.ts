import type { NodeSDK } from '@opentelemetry/sdk-node';

/** Probe and scrape requests arrive every few seconds and carry no user signal. */
export const isNoiseRequest = (url: string | undefined): boolean =>
  /^\/(health(\/|\?|$)|metrics(\?|$))/.test(url ?? '');

/**
 * Starts OpenTelemetry when OTEL_EXPORTER_OTLP_ENDPOINT is set; otherwise loads nothing.
 * Must run before other imports so http, express and mongoose get patched.
 */
export function startTracing(
  env: NodeJS.ProcessEnv = process.env,
): NodeSDK | undefined {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint) {
    return undefined;
  }

  // Lazy load: OpenTelemetry costs ~50 MB RSS and ~0.5 s at startup.
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
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => isNoiseRequest(req.url),
        },
      }),
    ],
  });

  sdk.start();
  process.once('SIGTERM', () => {
    void sdk.shutdown();
  });

  return sdk;
}
