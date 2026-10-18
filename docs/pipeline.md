# Pipeline: from commit to running pod

Two GitHub Actions workflows. `ci.yml` runs on GitHub-hosted runners and ends with an image in GHCR. `cd.yml` runs on a self-hosted runner (the laptop that hosts the kind cluster) and ends with that exact image serving traffic.

```
push / PR
  │
  ├─ quality    lint · unit + coverage · e2e (in-memory MongoDB) · build
  ├─ security   gitleaks (full history) · pnpm audit --prod --audit-level=high
  └─ manifests  kustomize build dev+prod+monitoring · kubectl dry-run · shellcheck · actionlint
        │  all three green
        ▼
     build      docker buildx (cache) → tags sha-<7>, sha-<40>, <branch>
                Trivy: fail on fixable HIGH/CRITICAL, SARIF → Security tab
                push to ghcr.io/souvik-cyclic/passx-backend   (not on PRs)
                scripts/docker-smoke.sh: container boots, /version == commit
        │  build succeeded on a push (never on a pull request)
        ▼  ci.yml calls cd.yml as a reusable workflow
  deploy-dev   (self-hosted, Environment "development", automatic)
                pull image → kind load → scripts/deploy.sh dev sha-<7>
                assert /version.commit == sha → scripts/smoke.sh → rollback on failure
        │
        ▼
  deploy-prod  (self-hosted, Environment "production", REQUIRES APPROVAL)
                same steps + drift check; automatic rollout undo on failure
```

## Why it is shaped this way

- **Checks before build.** A broken test or a leaked secret never produces an image, so nothing downstream can accidentally deploy it.
- **Image tags are commits.** `sha-<7>` is the only tag the manifests ever reference. `GET /version` on the running pod returns the full commit, the tag, the build time and the pipeline run URL, so "what is running" is answerable from the app itself. `latest` is never produced.
- **Self-hosted runner for CD.** GitHub-hosted runners cannot reach a cluster on a laptop. A pull-based tool (Argo CD) was the alternative; the runner keeps one code path (`scripts/deploy.sh`) for local and pipeline deploys and makes the approval gate a GitHub feature instead of a second UI.
- **CD is a reusable workflow called by CI**, not a `workflow_run` trigger. `workflow_run` only fires for workflows on the default branch, so it could never run for a feature-branch PR; the `workflow_call` form runs on any branch, inherits the Environment secrets, and can only be reached from a push build in this repository.
- **Automation versus approval.** dev deploys on every green build because it exists to be broken. prod waits for a human click on the `production` Environment because the cost of a bad release is user-facing.
- **Rollback is automatic.** If `rollout status`, the version assertion, the smoke test or the drift check fails, the job runs `kubectl rollout undo` and reports the restored tag. With `maxUnavailable: 0` the failed release never took traffic anyway.
- **Secrets never touch git.** Deploy jobs write `secrets.env` and `mongo.env` from GitHub Environment secrets with `umask 077` and delete them in an `always()` step.
- **Superseded runs are cancelled** (`concurrency` per ref) so an older commit cannot be deployed after a newer one.

## Releases

A release is a `v*` git tag. Pushing one runs the same CI gates, pushes the image with the `vX.Y.Z` tag next to `sha-<7>`, and the `release` job creates a GitHub Release with generated notes, the image reference, its digest and the run URL. Tags never deploy by themselves; deployment stays with branch pushes and the production approval, or `cd.yml` run by hand with the commit SHA.

```
git tag v1.0.0 <commit> && git push origin v1.0.0
```

## Reading a run

1. Open the run from the commit's status check or the Actions tab.
2. The `build` job summary shows the image, digest, commit and run URL.
3. The `deploy-*` job summaries show the `/version` JSON the cluster returned after the rollout.
4. The Security tab shows Trivy findings for the image (SARIF).

## When a gate fails

| Gate | Typical cause | Fix |
|---|---|---|
| `pnpm audit` | new advisory in a dependency | `pnpm update` within semver; if the fix is a major, bump deliberately and run the suites; if no fix exists, add a dated `pnpm.auditConfig.ignoreCves` entry with a justification in the PR |
| gitleaks | a credential-shaped string | rotate the credential first, then remove it from history or add a `.gitleaks.toml` allowlist entry for a verified false positive |
| Trivy | fixable HIGH/CRITICAL in the base image or a dependency | rebuild (base image refresh) or bump the package; unfixable findings are already ignored (`ignore-unfixed`) and reviewed in the Security tab |
| deploy smoke | the app serves but a journey step fails | the job has already rolled back; read the pod logs in Loki for the failing request id |

## Setting up the self-hosted runner

Documented in `docs/runbook.md`. In short: GitHub → Settings → Actions → Runners → New self-hosted runner, label `passx`, run as the laptop user that owns `~/.kube/config` for `kind-passx`, start it as a user service so it survives logout. The runner needs `docker`, `kind`, `kubectl`, `kustomize`, `curl`, `python3`.

## Environments

| Environment | Reviewers | Secrets | Used by |
|---|---|---|---|
| `development` | none | `JWT_SECRET`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD` | `deploy-dev` |
| `production` | repository owner (required) | same names, different values | `deploy-prod` |

Seed the Mongo values from the current `k8s/overlays/<env>/mongo.env`: the Mongo root password is baked into the data volume at first start and cannot be changed by redeploying.
