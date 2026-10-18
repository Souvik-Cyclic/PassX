#!/usr/bin/env bash
# Usage: scripts/netpol-test.sh <dev|prod>
# Proves only backend pods reach mongo:27017. In-pod markers stop errors passing.
set -euo pipefail

ENV_NAME="${1:?usage: netpol-test.sh <dev|prod>}"
NS="passx-${ENV_NAME}"
status=0

echo -n "denied  (unlabelled pod -> mongo:27017): "
out=$(kubectl -n "$NS" run netpol-probe --rm -i --restart=Never --image=busybox:1.36 --labels="run=netpol-probe" \
  --overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"p","image":"busybox:1.36","command":["sh","-c","nc -z -w 3 mongo 27017; echo NETPOL_RC=$?"],"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}}]}}' 2>&1 || true)
if grep -q "NETPOL_RC=1" <<<"$out"; then echo "PASS (connection blocked)"; else echo "FAIL"; echo "$out" | tail -5; status=1; fi

echo -n "allowed (backend pod -> mongo:27017):     "
out=$(kubectl -n "$NS" exec deploy/backend -- sh -c 'nc -z -w 3 mongo 27017; echo NETPOL_RC=$?' 2>&1 || true)
if grep -q "NETPOL_RC=0" <<<"$out"; then echo "PASS (connected)"; else echo "FAIL"; echo "$out" | tail -5; status=1; fi

exit $status
