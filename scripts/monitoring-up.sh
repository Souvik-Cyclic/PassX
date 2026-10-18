#!/usr/bin/env bash
# Installs the observability stack into namespace "monitoring":
# kube-prometheus-stack (Prometheus, Alertmanager, Grafana), Loki + Promtail,
# Jaeger all-in-one, plus the PassX ServiceMonitor, SLO rules and dashboard.
# Idempotent; chart versions are pinned below.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NS="monitoring"
KPS_VERSION="${KPS_VERSION:-92.10.1}"
LOKI_VERSION="${LOKI_VERSION:-7.3.0}"
PROMTAIL_VERSION="${PROMTAIL_VERSION:-6.17.1}"
ENV_FILE="$ROOT/k8s/monitoring/grafana.env"

kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'GRAFANA_ADMIN_PASSWORD=%s\n' "$(openssl rand -base64 24 | tr -d '\n=/+')" > "$ENV_FILE"
  echo "wrote $ENV_FILE"
fi
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null 2>&1 || true
helm repo add grafana https://grafana.github.io/helm-charts >/dev/null 2>&1 || true
helm repo update >/dev/null

installed() { helm list -n "$NS" -o json | grep -q "\"name\":\"$1\".*\"chart\":\"$2-$3\""; }

echo "== kube-prometheus-stack $KPS_VERSION"
if installed kps kube-prometheus-stack "$KPS_VERSION"; then echo "already installed"; else
  helm upgrade --install kps prometheus-community/kube-prometheus-stack --version "$KPS_VERSION" \
    -n "$NS" -f "$ROOT/k8s/monitoring/values-kube-prometheus-stack.yaml" \
    --set grafana.adminPassword="$GRAFANA_ADMIN_PASSWORD" --wait --timeout 12m >/dev/null
fi

echo "== loki $LOKI_VERSION"
if installed loki loki "$LOKI_VERSION"; then echo "already installed"; else
  helm upgrade --install loki grafana/loki --version "$LOKI_VERSION" \
    -n "$NS" -f "$ROOT/k8s/monitoring/values-loki.yaml" --wait --timeout 10m >/dev/null
fi

echo "== promtail $PROMTAIL_VERSION"
if installed promtail promtail "$PROMTAIL_VERSION"; then echo "already installed"; else
  helm upgrade --install promtail grafana/promtail --version "$PROMTAIL_VERSION" \
    -n "$NS" -f "$ROOT/k8s/monitoring/values-promtail.yaml" --wait --timeout 5m >/dev/null
fi

echo "== PassX monitoring manifests (ServiceMonitor, rules, dashboard, Jaeger)"
kubectl apply -k "$ROOT/k8s/monitoring/manifests" >/dev/null
kubectl -n "$NS" rollout status deploy/jaeger --timeout=180s >/dev/null

kubectl -n "$NS" get pods
echo "monitoring stack is ready"
