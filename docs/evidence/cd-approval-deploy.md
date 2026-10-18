# CD evidence: image to running pod, with approval

Workflow: `.github/workflows/cd.yml`, called by `ci.yml` after the build job on every push. Runs on the self-hosted runner `passx-laptop` (label `passx`), the machine that hosts the kind cluster.

## Run tied to commit 14290b0

| Item | Value |
|---|---|
| Commit | `14290b0` (`ci: run the deploy workflow from the build job`) |
| Run | https://github.com/Souvik-Cyclic/PassX/actions/runs/39113402610 |
| Jobs | quality ✔ · security ✔ · manifests ✔ · build/scan/push ✔ · **deploy dev (automatic) ✔** · **deploy prod (requires approval) ✔** |
| Approval | GitHub Environment `production`, required reviewer `Souvik-Cyclic`, approved at 14:33 IST; the job waited from 14:29 until then |

## What each deploy job proved

1. Pulled `ghcr.io/souvik-cyclic/passx-backend:sha-14290b0` from the registry and loaded it into kind.
2. `scripts/deploy.sh <env> sha-14290b0`: rendered the overlay, applied it, waited for the Mongo and backend rollouts, waited until the Ingress answered with the new tag.
3. Asserted `GET /version` `.commit == 14290b0…` (the full SHA of the commit that triggered the run).
4. Ran `scripts/smoke.sh`: readiness, version, signup, login, vault create/list/update/delete, unauthenticated rejection.
5. prod additionally ran `scripts/drift-check.sh prod sha-14290b0` (no drift).

## Running version after the run (queried from this machine)

```
$ curl -s http://dev.passx.127.0.0.1.nip.io/version
{"commit":"14290b0…","imageTag":"sha-14290b0","pipelineUrl":"https://github.com/Souvik-Cyclic/PassX/actions/runs/39113402610","pod":"backend-d9577c4dd-29qhj",…}

$ curl -s http://passx.127.0.0.1.nip.io/version
{"commit":"14290b0…","imageTag":"sha-14290b0","pipelineUrl":"https://github.com/Souvik-Cyclic/PassX/actions/runs/39113402610","pod":"backend-586fb67f6c-j7h55",…}

$ kubectl -n passx-prod get pods -l app=backend
backend-586fb67f6c-j7h55   1/1   Running
backend-586fb67f6c-nsxwx   1/1   Running
```

## Runner log (systemd user service `passx-runner`)

```
08:58:56Z: Running job: deploy / deploy dev (automatic)
08:59:36Z: Job deploy / deploy dev (automatic) completed with result: Succeeded
09:03:45Z: Running job: deploy / deploy prod (requires approval)
09:04:26Z: Job deploy / deploy prod (requires approval) completed with result: Succeeded
```

## Why the first attempt did not deploy

The first version of `cd.yml` used a `workflow_run` trigger. GitHub only evaluates `workflow_run` for workflows on the default branch, so on a feature branch nothing ever fired. The fix (`ci.yml` calling `cd.yml` as a reusable workflow with `secrets: inherit`) works on any branch and is reachable only from push builds in this repository.
