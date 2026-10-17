# Local rolling update and rollback demonstration (prod overlay, kind)

Commands run from the repo root against namespace `passx-prod`. Output is verbatim; long outputs are cut with `| tail` where shown.

## 1. Rolling update between two real images with traffic flowing

A probe loop hits `GET /version` and `GET /health/ready` once per second through the Ingress during the whole rollout and counts non-200 responses.

```
$ kubectl -n passx-prod get rs -l app=backend
NAME                 DESIRED   CURRENT   READY   AGE
backend-57b5d74b5b   2         2         2       3m40s
backend-66989dc956   0         0         0       12m
backend-8599954b54   0         0         0       20m
backend-dc64d5745    0         0         0       23m

$ curl -s http://passx.127.0.0.1.nip.io/version | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["imageTag"], d["pod"])'
sha-0f4ed33 backend-57b5d74b5b-tlc4z

$ (probe loop started in background: 1 req/s to /version and /health/ready)
$ make deploy ENV=prod TAG=sha-1ad6263   # older image, a real image-to-image rolling update
Waiting for deployment "backend" rollout to finish: 1 old replicas are pending termination...
Waiting for deployment "backend" rollout to finish: 1 old replicas are pending termination...
deployment "backend" successfully rolled out
ready: ingress serving sha-1ad6263 on passx.127.0.0.1.nip.io
running version:
{"commit":"1ad62639e8de211478528ace50bf42e0b856e341","imageTag":"sha-1ad6263","buildTime":"2026-10-17T23:08:29Z","pipelineUrl":"local","pod":"backend-5847b76fcb-s4fmb","node":"passx-control-plane","st

$ kubectl -n passx-prod get rs -l app=backend
NAME                 DESIRED   CURRENT   READY   AGE
backend-57b5d74b5b   0         0         0       3m56s
backend-5847b76fcb   2         2         2       12s
backend-66989dc956   0         0         0       13m
backend-8599954b54   0         0         0       20m
backend-dc64d5745    0         0         0       23m

$ make deploy ENV=prod TAG=sha-0f4ed33   # and forward again
ready: ingress serving sha-0f4ed33 on passx.127.0.0.1.nip.io
running version:
{"commit":"1ad62639e8de211478528ace50bf42e0b856e341","imageTag":"sha-1ad6263","buildTime":"2026-10-17T23:08:29Z","pipelineUrl":"local","pod":"backend-5847b76fcb-s4fmb","node":"passx-control-plane","st

$ # probe loop finished
$ wc -l < probe.log; grep -vc 'version=200 ready=200' probe.log
146
0
$ grep -v 'version=200 ready=200' probe.log | head
```

## 2. Bad release stalls, users unaffected, rollback

`BREAK_READINESS=true` makes the new pods fail readiness, standing in for a build that cannot serve.

```
$ kubectl -n passx-prod set env deploy/backend BREAK_READINESS=true
deployment.apps/backend env updated

$ kubectl -n passx-prod rollout status deploy/backend --timeout=60s
Waiting for deployment "backend" rollout to finish: 1 out of 2 new replicas have been updated...
error: timed out waiting for the condition

$ kubectl -n passx-prod get pods -l app=backend
NAME                       READY   STATUS    RESTARTS   AGE
backend-57b5d74b5b-vqd8t   1/1     Running   0          3m14s
backend-57b5d74b5b-w8trr   1/1     Running   0          3m8s
backend-8f5fb4887-z86cd    0/1     Running   0          60s

$ kubectl -n passx-prod get events --field-selector reason=Unhealthy --sort-by=.lastTimestamp | tail -2
3m10s       Warning   Unhealthy   pod/backend-57b5d74b5b-tlc4z   Readiness probe failed: Get "http://192.168.19.106:3000/health/ready": dial tcp 192.168.19.106:3000: connect: connection refused
4s          Warning   Unhealthy   pod/backend-8f5fb4887-z86cd    Readiness probe failed: HTTP probe failed with statuscode: 503

$ make smoke ENV=prod | tail -3   # old pods still serve the full journey
DELETE /vault/:id             OK 
GET /vault unauthenticated    OK 
SMOKE PASSED against http://passx.127.0.0.1.nip.io (commit 0f4ed3358c58b6e4cc3528fe9b0882d39277c255)

$ kubectl -n passx-prod rollout undo deploy/backend
deployment.apps/backend rolled back
$ kubectl -n passx-prod rollout status deploy/backend --timeout=120s
deployment "backend" successfully rolled out

$ kubectl -n passx-prod get pods -l app=backend
NAME                       READY   STATUS        RESTARTS   AGE
backend-57b5d74b5b-vqd8t   1/1     Running       0          3m15s
backend-57b5d74b5b-w8trr   1/1     Running       0          3m9s
backend-8f5fb4887-z86cd    0/1     Terminating   0          61s

$ curl -s http://passx.127.0.0.1.nip.io/version
{"commit":"0f4ed3358c58b6e4cc3528fe9b0882d39277c255","imageTag":"sha-0f4ed33","buildTime":"2026-10-17T23:21:55Z","pipelineUrl":"local","pod":"backend-57b5d74b5b-w8trr","node":"passx-control-plane","startedAt":"2026-10-17T23:46:00.827Z"}

$ make drift ENV=prod TAG=sha-0f4ed33   # live state matches the intended release
no drift in passx-prod
```

## Notes

- During the image-to-image rollout every probe returned 200: `maxUnavailable: 0` keeps at least one Ready pod serving, and readiness gates traffic to the new one.
- The broken release never received traffic for the same reason, and `kubectl rollout undo` restored the previous ReplicaSet. The pipeline in Phase 5 runs the same undo automatically when `rollout status` fails.
- `make drift` takes the intended tag as input; comparing against a tag that was never deployed would correctly report a difference.
