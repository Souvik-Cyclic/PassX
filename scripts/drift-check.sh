#!/usr/bin/env bash
# Usage: scripts/drift-check.sh <dev|prod> <image-tag>
# Exit 0 when the cluster matches the rendered overlay, 1 when it has drifted.
set -euo pipefail

ENV_NAME="${1:?usage: drift-check.sh <dev|prod> <tag>}"
TAG="${2:?usage: drift-check.sh <dev|prod> <tag>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
set +e
"$ROOT/scripts/render.sh" "$ENV_NAME" "$TAG" | kubectl diff -f - >"$OUT" 2>&1
rc=$?
set -e
case $rc in
  0) echo "no drift in passx-${ENV_NAME}" ;;
  1) echo "DRIFT detected in passx-${ENV_NAME}:"; cat "$OUT"; exit 1 ;;
  *) echo "drift check failed to run (kubectl diff exit $rc):"; cat "$OUT"; exit 2 ;;
esac
