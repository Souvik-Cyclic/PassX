# Rolling update and rollback demonstration (prod overlay, kind)

Commands run from the repo root against namespace `passx-prod`. Output is verbatim; long outputs are cut with `| tail` where shown. Images: `sha-eadce47` (commit eadce47, built locally with `make image`) and `sha-751580b` (commit 751580b, built and pushed by CI run 39112032571 and pulled from GHCR).

## 1. Rolling update between two real releases with traffic flowing

A probe loop hits `GET /version` and `GET /health/ready` once per second through the Ingress for the whole rollout and counts non-200 responses.

```
$ kubectl -n passx-prod get rs -l app=backend
NAME                 DESIRED   CURRENT   READY   AGE
backend-57b5d74b5b   0         0         0       8h
backend-5847b76fcb   0         0         0       8h
backend-66989dc956   0         0         0       9h
backend-7847b56746   2         2         2       65s
backend-8f5fb4887    0         0         0       8h
backend-dc64d5745    0         0         0       9h

$ curl -s http://passx.127.0.0.1.nip.io/version | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["commit"][:7], d["imageTag"], d["pod"])'
eadce47 sha-eadce47 backend-7847b56746-9kvsn

$ # probe loop started in background: 1 req/s to /version and /health/ready
$ make deploy ENV=prod TAG=sha-751580b   # image pulled from GHCR, not pre-loaded
Waiting for deployment "backend" rollout to finish: 1 old replicas are pending termination...
deployment "backend" successfully rolled out
ready: ingress serving sha-751580b on passx.127.0.0.1.nip.io
running version:
{"commit":"eadce4792a570fc2b48be45ad4e9bf2a61953667","imageTag":"sha-eadce47","buildTime":"2026-10-18T08:35:45Z","pipelineUrl":"local","pod":"backend-7847b56746-s6m7w","node":"passx-control-plane","startedAt":"2026-10-18T08:40:14.

$ kubectl -n passx-prod get events --field-selector reason=Pulled --sort-by=.lastTimestamp | tail -1
5s          Normal   Pulled   pod/backend-f894fd7df-qxrwx    Container image "ghcr.io/souvik-cyclic/passx-backend:sha-751580b" already present on machine and can be accessed by the pod

$ kubectl -n passx-prod get rs -l app=backend
NAME                 DESIRED   CURRENT   READY   AGE
backend-57b5d74b5b   0         0         0       8h
backend-5847b76fcb   0         0         0       8h
backend-66989dc956   0         0         0       9h
backend-7847b56746   0         0         0       81s
backend-8f5fb4887    0         0         0       8h
backend-f894fd7df    2         2         2       12s

$ # probe loop finished
$ wc -l < probe.log; grep -vc 'version=200 ready=200' probe.log
146
0
```

## 2. Bad release stalls, users unaffected, rollback

`BREAK_READINESS=true` makes the new pods fail readiness, standing in for a build that cannot serve. The pipeline (`.github/workflows/cd.yml`) runs the same `rollout undo` automatically when `rollout status` fails.

```
$ kubectl -n passx-prod set env deploy/backend BREAK_READINESS=true
deployment.apps/backend env updated

$ kubectl -n passx-prod rollout status deploy/backend --timeout=60s
Waiting for deployment "backend" rollout to finish: 1 out of 2 new replicas have been updated...
error: timed out waiting for the condition

$ kubectl -n passx-prod get pods -l app=backend
NAME                       READY   STATUS    RESTARTS   AGE
backend-6d46789998-crv4t   0/1     Running   0          60s
backend-f894fd7df-kfzt4    1/1     Running   0          3m27s
backend-f894fd7df-qxrwx    1/1     Running   0          3m21s

$ kubectl -n passx-prod get events --field-selector reason=Unhealthy --sort-by=.lastTimestamp | tail -2
42m         Warning   Unhealthy   pod/backend-57b5d74b5b-vqd8t   Readiness probe failed: HTTP probe failed with statuscode: 503
5s          Warning   Unhealthy   pod/backend-6d46789998-crv4t   Readiness probe failed: HTTP probe failed with statuscode: 503

$ make smoke ENV=prod | tail -3   # old pods still serve the full journey
DELETE /vault/:id             OK 
GET /vault unauthenticated    OK 
SMOKE PASSED against http://passx.127.0.0.1.nip.io (commit 751580bbbe2ecf383927325839a0af4a10d27485)

$ kubectl -n passx-prod rollout undo deploy/backend
deployment.apps/backend rolled back
$ kubectl -n passx-prod rollout status deploy/backend --timeout=120s
deployment "backend" successfully rolled out

$ kubectl -n passx-prod get pods -l app=backend
NAME                       READY   STATUS        RESTARTS   AGE
backend-6d46789998-crv4t   0/1     Terminating   0          61s
backend-f894fd7df-kfzt4    1/1     Running       0          3m28s
backend-f894fd7df-qxrwx    1/1     Running       0          3m22s

$ curl -s http://passx.127.0.0.1.nip.io/version
{"commit":"751580bbbe2ecf383927325839a0af4a10d27485","imageTag":"sha-751580b","buildTime":"2026-10-18T08:36:17Z","pipelineUrl":"https://github.com/Souvik-Cyclic/PassX/actions/runs/39112032571","pod":"backend-f894fd7df-qxrwx","node":"passx-control-plane","startedAt":"2026-10-18T08:41:28.665Z"}

$ make drift ENV=prod TAG=sha-751580b   # live state matches the intended release
no drift in passx-prod
```

## Notes

- Every probe during the image-to-image rollout returned 200: `maxUnavailable: 0` keeps at least one Ready pod serving and readiness gates traffic to the new one.
- The broken release never received traffic for the same reason; `kubectl rollout undo` restored the previous ReplicaSet, and the hashed ConfigMap means the undo also restores configuration.
- `make drift` takes the intended tag as input; comparing against a tag that was never deployed would correctly report a difference.
