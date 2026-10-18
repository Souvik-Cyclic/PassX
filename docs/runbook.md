# PassX runbook

How to build, run, deploy, observe and recover the PassX backend. Everything runs on one laptop with Docker; nothing needs a cloud account or sudo.

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Node.js | 24 (`backend/.node-version`) | local dev and tests only; the image brings its own |
| pnpm | 12.4.1 (`packageManager` in `backend/package.json`) | `corepack enable` or `npm i -g pnpm@12.4.1` |
| Docker | 29 | user in the `docker` group |
| kind, kubectl, kustomize, helm | v0.33.0, v1.37.1, v5.8.3, v3.19.0 | binaries in `~/.local/bin`; `make tools-check` |
| shellcheck, actionlint, gitleaks, trivy | any recent | optional locally; CI runs them |

## Run the backend locally (no Kubernetes)

```bash
cd backend
pnpm install --frozen-lockfile
cp .env.example .env            # set MONGO_URI and JWT_SECRET (32+ chars in production mode)
pnpm start:dev                  # http://localhost:3000, Swagger at /docs, metrics on :9464
pnpm test:cov && pnpm test:e2e  # unit + in-memory-Mongo e2e
```

The container alone: `docker build -t passx-backend:local backend && backend/scripts/docker-smoke.sh passx-backend:local`.

## Deploy to the local cluster

```bash
make cluster-up                         # kind "passx" + Calico + metrics-server + ingress-nginx
make secrets ENV=dev && make secrets ENV=prod
make image load deploy ENV=dev          # build sha-<short>, load into kind, apply overlay, wait
make smoke ENV=dev                      # signup → login → vault CRUD through the Ingress
make deploy ENV=prod && make smoke ENV=prod
make monitoring-up                      # Prometheus, Grafana, Alertmanager, Loki, Jaeger
```

| URL | What |
|---|---|
| http://dev.passx.127.0.0.1.nip.io | dev API (`/docs`, `/version`, `/health/ready`) |
| http://passx.127.0.0.1.nip.io | prod API |
| `make grafana` → http://localhost:3001 | dashboards (`admin`, password in `k8s/monitoring/grafana.env`) |
| `make prometheus` → http://localhost:9090 | targets, rules, alerts |
| `make jaeger` → http://localhost:16686 | traces, service `passx-backend` |

Details and design notes: `k8s/README.md`, `k8s/monitoring/README.md`, `docs/pipeline.md`.

## Deploy through the pipeline

1. Push to `adv-devops-project`. `ci.yml` lints, tests, scans, builds and pushes `ghcr.io/souvik-cyclic/passx-backend:sha-<7>`.
2. `cd.yml` deploys dev on the self-hosted runner automatically, then waits for approval on the `production` Environment.
3. Approve in Actions → the run → "Review deployments" → production → Approve.
4. The job summary shows `/version` from the cluster; `make status ENV=prod` shows the same locally.

### Self-hosted runner (one-time, on the laptop with the cluster)

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# Download URL and registration token: GitHub → Settings → Actions → Runners → New self-hosted runner (Linux x64)
./config.sh --url https://github.com/Souvik-Cyclic/PassX --token <REG_TOKEN> --labels passx --unattended --name passx-laptop
# run it as a user service so it survives logout (no sudo):
mkdir -p ~/.config/systemd/user && cat > ~/.config/systemd/user/passx-runner.service <<'EOF'
[Unit]
Description=GitHub Actions runner (PassX)
After=network-online.target
[Service]
WorkingDirectory=%h/actions-runner
ExecStart=%h/actions-runner/run.sh
Restart=always
Environment=PATH=%h/.local/bin:/usr/local/bin:/usr/bin:/bin
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload && systemctl --user enable --now passx-runner && loginctl enable-linger "$USER"
```

The runner user needs `~/.kube/config` for `kind-passx` and the tools in `~/.local/bin`.

### GitHub Environments and secrets

Create Environments `development` and `production` (production: required reviewer = repository owner). In each, add secrets `JWT_SECRET`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`. Seed the Mongo values from the local `k8s/overlays/<env>/mongo.env`: the root password is written into the data volume on first start and a different value in the Secret would lock the app out. `JWT_SECRET` may be rotated freely (users re-login).

```bash
for env in development production; do
  ov=$([ $env = development ] && echo dev || echo prod)
  gh secret set JWT_SECRET          --env $env --body "$(grep ^JWT_SECRET= k8s/overlays/$ov/secrets.env | cut -d= -f2-)"
  gh secret set MONGO_ROOT_USERNAME --env $env --body "$(grep ^MONGO_ROOT_USERNAME= k8s/overlays/$ov/mongo.env | cut -d= -f2-)"
  gh secret set MONGO_ROOT_PASSWORD --env $env --body "$(grep ^MONGO_ROOT_PASSWORD= k8s/overlays/$ov/mongo.env | cut -d= -f2-)"
done
```

Make the GHCR package public (Packages → passx-backend → Package settings → Change visibility) or the cluster cannot pull without an image pull secret. The CD job also `kind load`s the image, so deploys work either way.

## Alert response

### high-error-rate
`PassXHighErrorRate`: 5xx ratio above 1% for 2 minutes.
1. Grafana → PassX Backend → "Responses by status" and the Loki panel filtered to `level="error"`; the `requestId` in a log line links to the trace in Jaeger.
2. `mongo_up` 0? Follow [mongo-down](#mongo-down).
3. A release just went out? `make rollback ENV=prod` (or re-run the previous green CD run). The pipeline rolls back automatically when the smoke test fails, but errors that only appear under real traffic need this manual step.

### high-latency
`PassXHighLatency`: p95 above 300 ms for 10 minutes.
1. Dashboard "Backend CPU" against the 500m limit: throttling shows as CPU pinned at the limit. HPA should be scaling (prod); if it is at `maxReplicas`, raise it in `k8s/overlays/prod/hpa.yaml`.
2. Jaeger: open a slow trace; if Mongo spans dominate, check Mongo CPU and `kubectl top pod mongo-0`.

### mongo-down
`PassXMongoDown`: a backend pod cannot ping Mongo for 2 minutes. Readiness is already failing, so traffic is shed.
1. `kubectl -n passx-<env> get pod mongo-0`; `kubectl -n passx-<env> describe pod mongo-0` for evictions or PVC problems; `kubectl logs mongo-0`.
2. Scale or restart: `kubectl -n passx-<env> rollout restart sts/mongo`. The backend reconnects by itself; no restart needed.
3. Evidence of the alert firing and resolving: `docs/evidence/phase6-alerts.md`.

### backend-absent
`PassXBackendAbsent`: Prometheus has no healthy backend target for 5 minutes.
1. `kubectl -n passx-<env> get deploy backend` (scaled to zero? failed rollout?).
2. `kubectl -n monitoring get servicemonitor backend` and the NetworkPolicy `backend-allow-ingress` (port 9464 from namespace `monitoring`).

## Rollback and recovery

| Situation | Command |
|---|---|
| Bad release in prod | `make rollback ENV=prod` (runs `kubectl rollout undo` and waits) |
| Deploy a known-good tag | `make deploy ENV=prod TAG=sha-<7>` (image must be in GHCR or loaded in kind) |
| Check live state against git | `make drift ENV=prod TAG=sha-<7>` |
| Cluster is wedged | `make cluster-down && make cluster-up && make deploy ENV=dev` (data in PVCs is lost; this is a demo cluster) |

`docs/evidence/phase3-rollback-local.md` records a real rolling update under traffic and a stalled release that was undone.

## Known limitations

- Single node, single Mongo replica, local storage: data does not survive `make cluster-down`.
- Rate limits are per pod (in-memory); with 2–4 prod replicas the effective auth limit is 20–40 attempts per minute per client.
- Swagger UI needs inline scripts, so helmet's CSP is disabled for the whole API.
- Jaeger stores traces in memory; Loki keeps 48 h; Prometheus 2 d.
- The self-hosted runner must be online for CD; local `make deploy` is the manual fallback and runs the same scripts.
