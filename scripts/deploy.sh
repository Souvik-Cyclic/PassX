#!/usr/bin/env bash
# Usage: scripts/deploy.sh <dev|prod> <image-tag>
# Applies the overlay at that tag (set in a temp copy, never in git) and waits for rollout.
set -euo pipefail

ENV_NAME="${1:?usage: deploy.sh <dev|prod> <tag>}"
TAG="${2:?usage: deploy.sh <dev|prod> <tag>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-ghcr.io/souvik-cyclic/passx-backend}"
NS="passx-${ENV_NAME}"
OVERLAY="$ROOT/k8s/overlays/$ENV_NAME"

[[ -f "$OVERLAY/secrets.env" ]] || { echo "missing $OVERLAY/secrets.env (run: make secrets ENV=$ENV_NAME)" >&2; exit 1; }

"$ROOT/scripts/render.sh" "$ENV_NAME" "$TAG" | kubectl apply -f -

kubectl -n "$NS" rollout status statefulset/mongo --timeout=240s
kubectl -n "$NS" rollout status deploy/backend --timeout=240s

case "$ENV_NAME" in
  dev)  HOST="dev.passx.127.0.0.1.nip.io" ;;
  prod) HOST="passx.127.0.0.1.nip.io" ;;
  *)    HOST="" ;;
esac

if [[ -n "$HOST" ]]; then
  # Old pods serve briefly after rollout (preStop, endpoint propagation).
  # Five new-tag answers in a row rule out one lucky hit.
  "$ROOT/scripts/wait-for.sh" "ingress consistently serving $TAG on $HOST" 120 \
    sh -c "for i in 1 2 3 4 5; do curl -s --max-time 5 http://$HOST/version | grep -q '\"imageTag\":\"$TAG\"' || exit 1; sleep 1; done"
  echo "running version:"
  curl -s "http://$HOST/version"; echo
fi
