# Alert firing and recovery (dev namespace)

Mongo is scaled to zero in `passx-dev`; `mongo_up` drops to 0 on the backend pod and `PassXMongoDown` must fire after its 2 minute `for`. Readiness fails at the same time, so the Ingress stops routing to the pod. Output is verbatim from the Prometheus API through `kubectl port-forward`.

```
$ curl -s localhost:9090/api/v1/alerts | python3 -c '...'   # before
no PassX alerts active

$ kubectl -n passx-dev scale sts/mongo --replicas=0
statefulset.apps/mongo scaled
$ sleep 170

$ curl -s 'localhost:9090/api/v1/query?query=mongo_up'
[('passx-dev', 'backend-596cd5c948-mhmff', '0'), ('passx-prod', 'backend-57b5d74b5b-vqd8t', '1'), ('passx-prod', 'backend-57b5d74b5b-w8trr', '1')]

$ curl -s localhost:9090/api/v1/alerts | python3 -c '...'   # during the outage
[('PassXMongoDown', 'passx-dev', 'firing', 'PassX passx-dev: backend backend-596cd5c948-mhmff cannot reach Mongo')]

$ kubectl -n passx-dev get pods -l app=backend
NAME                       READY   STATUS    RESTARTS   AGE
backend-596cd5c948-mhmff   0/1     Running   0          15m

$ curl -s -o /dev/null -w '%{http_code}
' http://dev.passx.127.0.0.1.nip.io/health/ready
503

$ kubectl -n passx-dev scale sts/mongo --replicas=1 && kubectl -n passx-dev rollout status sts/mongo
statefulset.apps/mongo scaled
Waiting for 1 pods to be ready...
partitioned roll out complete: 1 new pods have been updated...
$ sleep 90

$ curl -s localhost:9090/api/v1/alerts | python3 -c '...'   # after recovery
no PassX alerts active

$ make smoke ENV=dev | tail -1
SMOKE PASSED against http://dev.passx.127.0.0.1.nip.io (commit 0f4ed3358c58b6e4cc3528fe9b0882d39277c255)
```

Response action from the runbook: check `kubectl -n passx-dev get pods mongo-0` and its logs; here the cause was the scale-down and the fix was scaling back. The backend needed no restart: it reconnected on its own and readiness returned to 200.
