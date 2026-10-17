#!/usr/bin/env bash
# Usage: scripts/render.sh <dev|prod> <image-tag>  → rendered manifests on stdout
# Copies the overlay to a temp dir (so `kustomize edit` never dirties git),
# points it at the requested tag, and builds it.
set -euo pipefail

ENV_NAME="${1:?}"; TAG="${2:?}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-ghcr.io/souvik-cyclic/passx-backend}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -r "$ROOT/k8s/base" "$TMP/base"
mkdir -p "$TMP/overlays"
cp -r "$ROOT/k8s/overlays/$ENV_NAME" "$TMP/overlays/$ENV_NAME"
(
  cd "$TMP/overlays/$ENV_NAME"
  kustomize edit set image "${IMAGE}=${IMAGE}:${TAG}"
  kustomize build .
)
