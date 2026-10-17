#!/usr/bin/env bash
# Usage: scripts/netpol-test.sh <dev|prod>
# Proves the Mongo NetworkPolicy is enforced: an unlabelled pod must NOT reach
# mongo:27017, a pod labelled app=backend must.
set -euo pipefail

ENV_NAME="${1:?usage: netpol-test.sh <dev|prod>}"
NS="passx-${ENV_NAME}"
IMG="busybox:1.36"
probe() { # name labels expected(0|1)
  local name="$1" labels="$2" expect="$3" rc=0
  kubectl -n "$NS" run "$name" --rm -i --restart=Never --image="$IMG" --labels="$labels" \
    --overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"p","image":"busybox:1.36","command":["sh","-c","nc -z -w 3 mongo 27017"],"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}}]}}' \
    >/dev/null 2>&1 || rc=$?
  if [[ "$rc" -eq "$expect" ]]; then
    echo "PASS: $name (labels=$labels) exit=$rc"
  else
    echo "FAIL: $name (labels=$labels) exit=$rc expected=$expect"; return 1
  fi
}
status=0
probe netpol-probe-denied "run=netpol-probe" 1 || status=1
probe netpol-probe-allowed "app=backend" 0 || status=1
exit $status
