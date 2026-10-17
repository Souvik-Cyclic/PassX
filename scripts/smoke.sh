#!/usr/bin/env bash
# Usage: scripts/smoke.sh <base-url>
# Walks the real user journey: readiness, version, signup, login, vault
# create/list/update/delete, auth rejection. Exits 1 on the first mismatch.
set -euo pipefail

BASE="${1:?usage: smoke.sh http://host}"
CURL=(curl -s --max-time 10)
EMAIL="smoke-$(date +%s%N)@example.com"
HASH="smoke-hash-$RANDOM"

json() { python3 -c 'import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1]))' "$1"; }
# check <name> <actual> <expected> [detail]
check() {
  printf '%-30s' "$1"
  if [[ "$2" == "$3" ]]; then echo "OK ${4:-}"; else echo "FAIL got='$2' want='$3' ${4:-}"; exit 1; fi
}

code=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/health/ready")
check "GET /health/ready" "$code" 200

ver=$("${CURL[@]}" "$BASE/version")
commit=$(echo "$ver" | json 'd["commit"]'); pod=$(echo "$ver" | json 'd["pod"]')
check "GET /version" "$([[ -n "$commit" ]] && echo yes)" yes "commit=$commit pod=$pod"

tok=$("${CURL[@]}" -X POST "$BASE/auth/signup" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"authKeyHash\":\"$HASH\",\"encryptedMasterKey\":\"emk\"}" | json 'd["accessToken"]')
check "POST /auth/signup" "$([[ ${#tok} -gt 20 ]] && echo token)" token

emk=$("${CURL[@]}" -X POST "$BASE/auth/login" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"authKeyHash\":\"$HASH\"}" | json 'd["encryptedMasterKey"]')
check "POST /auth/login" "$emk" emk

auth=(-H "authorization: Bearer $tok" -H 'content-type: application/json')

id=$("${CURL[@]}" -X POST "$BASE/vault" "${auth[@]}" -d '{"encryptedData":"blob1"}' | json 'd["_id"]')
check "POST /vault" "${#id}" 24 "id=$id"

n=$("${CURL[@]}" "$BASE/vault" "${auth[@]}" | json 'len(d)')
check "GET /vault" "$n" 1

v=$("${CURL[@]}" -X PUT "$BASE/vault/$id" "${auth[@]}" -d '{"encryptedData":"blob2"}' | json 'd["encryptedData"]')
check "PUT /vault/:id" "$v" blob2

s=$("${CURL[@]}" -X DELETE "$BASE/vault/$id" "${auth[@]}" | json 'd["success"]')
check "DELETE /vault/:id" "$s" True

code=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/vault")
check "GET /vault unauthenticated" "$code" 401

echo "SMOKE PASSED against $BASE (commit $commit)"
