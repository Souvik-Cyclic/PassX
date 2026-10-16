#!/usr/bin/env bash
# Creates (or reuses) the kind cluster "passx" and installs the add-ons the
# project depends on: Calico (NetworkPolicy enforcement), metrics-server (HPA)
# and ingress-nginx (host ports 80/443). Idempotent: safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTER="passx"
CALICO_VERSION="${CALICO_VERSION:-v3.33.0}"
METRICS_SERVER_CHART_VERSION="${METRICS_SERVER_CHART_VERSION:-3.14.0}"
INGRESS_NGINX_CHART_VERSION="${INGRESS_NGINX_CHART_VERSION:-4.15.1}"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
  kind create cluster --config "$ROOT/k8s/kind/cluster.yaml" --wait 0s
else
  echo "cluster ${CLUSTER} already exists"
fi
kubectl config use-context "kind-${CLUSTER}" >/dev/null

echo "== Calico ${CALICO_VERSION}"
kubectl apply -f "https://raw.githubusercontent.com/projectcalico/calico/${CALICO_VERSION}/manifests/calico.yaml" >/dev/null
kubectl -n kube-system rollout status ds/calico-node --timeout=240s
"$ROOT/scripts/wait-for.sh" "node Ready" 180 \
  kubectl wait --for=condition=Ready node --all --timeout=10s

echo "== metrics-server chart ${METRICS_SERVER_CHART_VERSION}"
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ >/dev/null 2>&1 || true
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
helm repo update >/dev/null
# helm_ensure <release> <namespace> <chart-version> <helm args...>
# Skips the upgrade when the release is already deployed at the pinned chart
# version, so re-runs do not re-download charts.
helm_ensure() {
  local release="$1" ns="$2" version="$3"; shift 3
  if helm list -n "$ns" -o json 2>/dev/null | grep -q "\"name\":\"$release\".*\"chart\":\"$release-$version\""; then
    echo "$release $version already installed"
    return 0
  fi
  helm upgrade --install "$release" "$@" --namespace "$ns" --version "$version" >/dev/null
}

helm_ensure metrics-server kube-system "$METRICS_SERVER_CHART_VERSION" \
  metrics-server/metrics-server --set 'args={--kubelet-insecure-tls}' --wait --timeout 180s

echo "== ingress-nginx chart ${INGRESS_NGINX_CHART_VERSION}"
helm_ensure ingress-nginx ingress-nginx "$INGRESS_NGINX_CHART_VERSION" \
  ingress-nginx/ingress-nginx --create-namespace \
  -f "$ROOT/k8s/kind/ingress-nginx-values.yaml" --wait --timeout 240s

"$ROOT/scripts/wait-for.sh" "metrics API" 120 kubectl top nodes
# shellcheck disable=SC2016  # expansion is meant to happen inside the retried shell
"$ROOT/scripts/wait-for.sh" "ingress on 127.0.0.1:80" 60 \
  sh -c 'test "$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)" = 404'

kubectl get nodes
echo "cluster ${CLUSTER} is ready"
