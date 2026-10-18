# Observability stack (namespace `monitoring`)

Metrics, logs and traces for the PassX backend, all in the kind cluster.

```bash
make monitoring-up     # idempotent; ~3 minutes first time
make grafana           # http://localhost:3001  (user admin, password in k8s/monitoring/grafana.env)
make prometheus        # http://localhost:9090
make alertmanager      # http://localhost:9093
make jaeger            # http://localhost:16686
make loki              # http://localhost:3100 (API only)
```

## What runs

| Component | Install | Purpose |
|---|---|---|
| kube-prometheus-stack 92.10.1 (Prometheus Operator v0.94) | Helm, `values-kube-prometheus-stack.yaml` | Prometheus (2 d retention), Alertmanager, Grafana, kube-state-metrics, node-exporter |
| Loki 3.6 (chart 7.3.0) | Helm, `values-loki.yaml` | Log store, single binary, filesystem storage, 48 h retention |
| Promtail (chart 6.17.1) | Helm, `values-promtail.yaml` | DaemonSet tailing every container log; labels `namespace`, `pod`, `container`, `app` |
| Jaeger all-in-one 1.73 | `manifests/jaeger.yaml` | OTLP gRPC receiver on 4317, UI on 16686, in-memory storage |
| PassX glue | `manifests/` | `ServiceMonitor` (scrapes port 9464 in `passx-dev` and `passx-prod`), `PrometheusRule` with the SLO, Grafana dashboard ConfigMap |

The backend sends spans to `jaeger-collector.monitoring:4317` because `OTEL_EXPORTER_OTLP_ENDPOINT` is set in `k8s/base/backend/config.env`. Prometheus reaches port 9464 because the backend NetworkPolicy allows it from this namespace only.

## How the three signals connect

- **Metrics** answer "is it healthy and how fast": `http_requests_total`, `http_request_duration_seconds`, `mongo_up`, plus kube-state-metrics for restarts, HPA replicas, CPU and memory.
- **Logs** answer "what did the code say": pino JSON lines with `level`, `requestId`, `traceId`, request method, url, status. In Grafana use the Loki datasource with `{namespace="passx-prod", app="backend"} | json | level="error"`.
- **Traces** answer "where did the time go": one trace per request with spans for the Express route, the Nest handler, and each Mongo command. The `traceId` in a log line opens the same trace in Jaeger (Grafana derived field).

## SLO and alerts (`manifests/prometheusrule-passx-slo.yaml`)

SLO: 99% of requests succeed (status < 500) and p95 latency stays under 300 ms, measured per namespace over 5 minutes.

| Alert | Fires when | For | Response |
|---|---|---|---|
| `PassXHighErrorRate` | 5xx ratio > 1% with at least 0.1 req/s | 2 m | Check `mongo_up` and backend logs with `level="error"`; if a release just went out, `make rollback ENV=prod`. |
| `PassXHighLatency` | p95 > 300 ms | 10 m | Check CPU throttling on the dashboard and Mongo latency spans in Jaeger; HPA should already be scaling; raise limits or add replicas. |
| `PassXMongoDown` | any backend pod reports `mongo_up == 0` | 2 m | `kubectl -n passx-prod get pods mongo-0`, `kubectl logs`; PVC full or pod evicted are the usual causes. Backend readiness fails in parallel, so traffic is already shed. |
| `PassXBackendAbsent` | no healthy scrape target | 5 m | Deployment scaled to zero or NetworkPolicy change blocked 9464; check `kubectl -n passx-prod get deploy backend` and the policy. |

Alertmanager keeps the default receiver (no paging integration in this project); alerts are visible in its UI and in Grafana's alert list.

## Dashboard

`manifests/dashboards/passx-backend.json` is provisioned through the Grafana sidecar (ConfigMap label `grafana_dashboard: "1"`, folder `PassX`). Panels: Mongo reachable, request rate, 5xx ratio vs SLO, p95 vs SLO, pods ready, restarts, request rate by route, responses by status, CPU and memory vs limits, HPA replicas, Node.js heap, and a Loki panel of warnings and errors. Edit in the UI, then export JSON and commit it here.

## Screenshots

See `docs/evidence.md` section 5a for the dashboard, alert, target and trace screenshots.

## Limitations

- Jaeger storage is in memory (last 5 000 traces; 20 000 was OOM-killed at the previous 512Mi limit); Loki keeps 48 h; Prometheus 2 d. Health and metrics requests are not traced. Fine for a demo cluster, not for audit history.
- No Alertmanager receiver is configured. Production would route `severity=page` to an on-call tool.
- Everything is single replica on one node.
- Loki and Jaeger are fenced by NetworkPolicy, but the Prometheus and Alertmanager web endpoints are not: any pod in the cluster could query metrics or silence alerts. The next step is a default-deny ingress policy for the `monitoring` namespace with explicit allows for Grafana → Prometheus/Alertmanager, Prometheus → Alertmanager and the operator's webhook; it was left out because every scrape and sidecar path would need verifying.
