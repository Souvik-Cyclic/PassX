#!/usr/bin/env bash
# Usage: scripts/deploy.sh <dev|prod> <image-tag>
# Renders the overlay with the given image tag, applies it, waits for the
# rollout, and prints the running version. Leaves the repo clean: the tag is
# set in a temporary copy of the overlay, never in the committed files.
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
  # Old pods keep serving until the Ingress drops them (preStop sleep plus
  # endpoint propagation). Require five consecutive answers with the new tag
  # so a single lucky hit on the new pod cannot pass the check.
  "$ROOT/scripts/wait-for.sh" "ingress consistently serving $TAG on $HOST" 120 \
    sh -c "for i in 1 2 3 4 5; do curl -s --max-time 5 http://$HOST/version | grep -q '\"imageTag\":\"$TAG\"' || exit 1; sleep 1; done"
  echo "running version:"
  curl -s "http://$HOST/version"; echo
fi
