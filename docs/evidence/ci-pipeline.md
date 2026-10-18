# CI evidence: commit to image

Pipeline: `.github/workflows/ci.yml`. Every push and pull request runs lint, unit and e2e tests, secret and dependency scans, manifest validation, then builds the image, scans it with Trivy and pushes it to GHCR tagged by commit.

## Green run tied to a commit

| Item | Value |
|---|---|
| Commit | `751580bbbe2ecf383927325839a0af4a10d27485` |
| Run | https://github.com/Souvik-Cyclic/PassX/actions/runs/39112032571 |
| Jobs | lint/unit/e2e ✔, secrets and dependency scan ✔, kubernetes manifests and scripts ✔, build/scan/push ✔ |
| Image | `ghcr.io/souvik-cyclic/passx-backend:sha-751580b` |
| Image digest | `sha256:8d2b488937e61da908d18cf99e369c1e1c3154ada272df6d27e34816f77c086b` |
| Trivy | 0 fixable HIGH/CRITICAL (gate: `--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1`); SARIF uploaded to the Security tab |
| In-pipeline smoke | container started from the pushed image; `GET /version` returned `commit=751580bbbe2ecf383927325839a0af4a10d27485` |

## Registry is publicly pullable

```
$ docker logout ghcr.io && docker manifest inspect ghcr.io/souvik-cyclic/passx-backend:sha-751580b >/dev/null && echo pull-ok
pull-ok
```

## Earlier runs that failed, and why (kept for honesty)

| Run | Cause | Fix |
|---|---|---|
| 39110810468 | `kubectl apply --dry-run=client` needs an API server; none on GitHub runners | validate rendered manifests offline with kubeconform |
| 39111106161 | gitleaks found a Grafana admin password committed by mistake; older shellcheck flagged `A && B \|\| C` | password rotated, commit rewritten out of the branch, script fixed |
| 39111381276 | trivy-action v0.33.1 could not download its bundled Trivy | newer action pinned by SHA with an explicit Trivy version |
| 39111911532 | Trivy found fixable HIGH CVEs in npm bundled with `node:24-alpine` | npm removed from the runtime image |

Each failure was a real gate doing its job; the pipeline never produced a deployable image from a commit that failed a check.
