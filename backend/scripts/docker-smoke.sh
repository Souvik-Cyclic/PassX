#!/usr/bin/env bash
# Usage: scripts/docker-smoke.sh IMAGE [EXPECTED_COMMIT]
# Starts MONGO_IMAGE (default mongo:7) unless MONGO_URI is set, then checks
# HEALTH_PATH, the "node" user and /version. Cleans up everything it starts.
set -euo pipefail

IMAGE="${1:-}"
EXPECTED_COMMIT="${2:-}"
HEALTH_PATH="${HEALTH_PATH:-/health/live}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"
MONGO_IMAGE="${MONGO_IMAGE:-mongo:7}"

if [[ -z "$IMAGE" ]]; then
  echo "usage: $0 IMAGE [EXPECTED_COMMIT]" >&2
  exit 2
fi

RUN_ID="passx-smoke-$$"
NETWORK=""
MONGO_CONTAINER=""
CONTAINER=""

cleanup() {
  if [[ -n "$CONTAINER" ]]; then docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; fi
  if [[ -n "$MONGO_CONTAINER" ]]; then docker rm -f "$MONGO_CONTAINER" >/dev/null 2>&1 || true; fi
  if [[ -n "$NETWORK" ]]; then docker network rm "$NETWORK" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  if [[ -n "$CONTAINER" ]]; then
    echo "--- container logs (tail) ---" >&2
    docker logs --tail 50 "$CONTAINER" >&2 || true
  fi
  exit 1
}

if [[ -z "${MONGO_URI:-}" ]]; then
  NETWORK="$(docker network create "$RUN_ID")"
  MONGO_CONTAINER="$(docker run -d --network "$RUN_ID" --name "${RUN_ID}-mongo" "$MONGO_IMAGE")"
  MONGO_URI="mongodb://${RUN_ID}-mongo:27017/passx-smoke"
  echo "mongo=${MONGO_CONTAINER:0:12} image=${MONGO_IMAGE}"
fi

NETWORK_ARGS=()
[[ -n "$NETWORK" ]] && NETWORK_ARGS=(--network "$RUN_ID")

CONTAINER="$(docker run -d "${NETWORK_ARGS[@]}" \
  -e MONGO_URI="$MONGO_URI" \
  -e JWT_SECRET=smoke-test-secret-value-at-least-32-chars \
  -p 127.0.0.1:0:3000 \
  "$IMAGE")"

PORT="$(docker port "$CONTAINER" 3000/tcp | head -n1 | sed 's/.*://')"
[[ -n "$PORT" ]] || fail "could not discover mapped host port"
BASE_URL="http://127.0.0.1:${PORT}"

echo "container=${CONTAINER:0:12} url=${BASE_URL}"

deadline=$((SECONDS + TIMEOUT_SECONDS))
status=""
while (( SECONDS < deadline )); do
  status="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${HEALTH_PATH}" || true)"
  if [[ "$status" == "200" ]]; then
    break
  fi
  if [[ "$(docker inspect --format '{{.State.Running}}' "$CONTAINER")" != "true" ]]; then
    fail "container exited before ${HEALTH_PATH} answered"
  fi
  sleep 1
done
[[ "$status" == "200" ]] || fail "GET ${HEALTH_PATH} did not return 200 within ${TIMEOUT_SECONDS}s (last status: ${status:-none})"
echo "GET ${HEALTH_PATH} -> 200"

USER_IN_CONTAINER="$(docker inspect --format '{{.Config.User}}' "$CONTAINER")"
[[ "$USER_IN_CONTAINER" == "node" ]] || fail "container user is '${USER_IN_CONTAINER}', expected 'node'"
echo "user=node"

# Only when EXPECTED_COMMIT is given (CI passes the APP_COMMIT build arg).
if [[ -n "$EXPECTED_COMMIT" ]]; then
  body="$(curl -sf "${BASE_URL}/version")" || fail "GET /version failed"
  if command -v jq >/dev/null 2>&1; then
    commit="$(printf '%s' "$body" | jq -r '.commit')"
  else
    commit="$(printf '%s' "$body" | python3 -c 'import json,sys; print(json.load(sys.stdin)["commit"])')"
  fi
  [[ "$commit" == "$EXPECTED_COMMIT" ]] || fail "/version commit is '${commit}', expected '${EXPECTED_COMMIT}'"
  echo "/version commit=${commit}"
fi

echo "OK"
