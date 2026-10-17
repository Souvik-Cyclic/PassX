#!/usr/bin/env bash
# Usage: scripts/drift-check.sh <dev|prod> <image-tag>
# Exit 0 when the cluster matches the rendered overlay, 1 when it has drifted.
set -euo pipefail

ENV_NAME="${1:?usage: drift-check.sh <dev|prod> <tag>}"
TAG="${2:?usage: drift-check.sh <dev|prod> <tag>}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if "$ROOT/scripts/render.sh" "$ENV_NAME" "$TAG" | kubectl diff -f - >/tmp/passx-drift.$$ 2>&1; then
  echo "no drift in passx-${ENV_NAME}"
  rm -f /tmp/passx-drift.$$
else
  echo "DRIFT detected in passx-${ENV_NAME}:"
  cat /tmp/passx-drift.$$
  rm -f /tmp/passx-drift.$$
  exit 1
fi
