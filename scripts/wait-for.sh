#!/usr/bin/env bash
# Usage: scripts/wait-for.sh "<description>" <timeout-seconds> <command...>
# Re-runs the command until it exits 0 or the timeout passes.
set -euo pipefail

desc="$1"; timeout="$2"; shift 2
start=$(date +%s)
until "$@" >/dev/null 2>&1; do
  if (( $(date +%s) - start > timeout )); then
    echo "timeout after ${timeout}s waiting for: ${desc}" >&2
    exit 1
  fi
  sleep 3
done
echo "ready: ${desc}"
