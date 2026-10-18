# Release control evidence: a bad release caught and rolled back by the pipeline

The local demonstration in `rollout-and-rollback-local.md` showed the mechanics with `kubectl`. This one goes through the real delivery path: a commit, CI, and the CD job on the self-hosted runner, with no manual intervention after the push.

## The bad release

Commit `demo: bad release that never becomes ready` sets `BREAK_READINESS=true` in the dev overlay's config. The image builds and passes every CI check (the bug is in configuration, which is a common real-world shape), so the pipeline reaches `deploy dev`.

| Item | Value |
|---|---|
| Run | https://github.com/Souvik-Cyclic/PassX/actions/runs/39114275555 |
| CI jobs | quality ✔ · security ✔ · manifests ✔ · build/scan/push ✔ |
| deploy dev | **failure** at "Deploy and wait for rollout" (`kubectl rollout status --timeout=240s` timed out: the new pod never passed readiness) |
| Roll back on failure | **success**: `deployment.apps/backend rolled back` … `deployment "backend" successfully rolled out` |
| deploy prod | never started (`needs: deploy-dev`) |

## What users saw during those four minutes

```
$ kubectl -n passx-dev get pods -l app=backend          # while the rollout was stalled
backend-6d4b496db9-gpl5h   0/1   Running   0   2m55s    # new pod, readiness 503
backend-d4f45bb97-d6v8c    1/1   Running   0   8m23s    # old pod, still serving

$ kubectl -n passx-dev get events --field-selector reason=Unhealthy | tail -1
Warning  Unhealthy  pod/backend-6d4b496db9-gpl5h  Readiness probe failed: HTTP probe failed with statuscode: 503

$ curl -s http://dev.passx.127.0.0.1.nip.io/version | python3 -c '...'
dev still serving: 2a35d9f
```

With `maxUnavailable: 0`, the Deployment never removed the healthy pod, so the Ingress kept routing to it. The broken pod received no user traffic at any point.

## After the job finished

```
$ curl -s http://dev.passx.127.0.0.1.nip.io/version | python3 -c '...'
dev serving: 2a35d9f sha-2a35d9f           # the previous release, restored by the pipeline

$ kubectl -n passx-dev get pods -l app=backend
backend-d4f45bb97-d6v8c   1/1   Running   0

$ kubectl -n passx-dev rollout history deploy/backend | tail -2
9   <none>
10  <none>                                 # revision 10 = rollback to the revision-8 template
```

## A rollback that should not have happened, and what it taught

The first attempt to deploy the revert (run 39114842590) also rolled back. The rollout had completed, but the step "Assert the running version is this commit" made one request through the Ingress and hit the old pod, which stays in rotation for a few seconds (5 s `preStop` plus endpoint propagation). The mismatch triggered `rollout undo`, so dev stayed on the previous release and nothing broke; the detection was simply too eager. The fix (`cd: require consecutive version matches after rollout`) requires five consecutive matching answers in both `scripts/deploy.sh` and the workflow before the version is considered settled. This is the kind of flaky gate that erodes trust in automation if left alone, so it was fixed rather than retried.

## Recovery

The bad commit was reverted (`Revert "demo: bad release that never becomes ready"`, `0e41e26`). After the verification fix above, run 39115197134 (commit `c83bb6b`) deployed dev automatically and prod after approval; `GET /version` on prod returns `c83bb6b` with that run URL.

## Why this is the response action, not just a demo

The alert `PassXHighErrorRate` and the readiness-based traffic shedding are the detection side; the pipeline's automatic `rollout undo` plus the human `make rollback ENV=prod` are the response side documented in `docs/runbook.md`. Nothing in this run needed a person at the keyboard.
