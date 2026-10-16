import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

/**
 * Starts OpenTelemetry tracing when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 * Must run before any other module is imported so auto-instrumentation can
 * patch http, express, and mongoose. Returns undefined (and loads nothing)
 * when tracing is not configured, which keeps tests fast and offline.
 */
export function startTracing(
  env: NodeJS.ProcessEnv = process.env,
): NodeSDK | undefined {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint) {
    return undefined;
  }

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
