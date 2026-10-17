# PassX on Kubernetes (local kind cluster)

Everything here runs on a laptop with Docker. No cloud account, no sudo.

## Prerequisites

| Tool | Version used | Install |
|---|---|---|
| Docker | 29.x | distro package |
| kind | v0.33.0 | `https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-amd64` |
| kubectl | v1.37.1 | `https://dl.k8s.io/release/v1.37.1/bin/linux/amd64/kubectl` |
| kustomize | v5.8.3 | GitHub release tarball |
| helm | v3.19.0 | `https://get.helm.sh/helm-v3.19.0-linux-amd64.tar.gz` |

Put the binaries in `~/.local/bin`. `make tools-check` confirms they are on `PATH`.

## Quick start

```bash
make cluster-up                 # kind + Calico + metrics-server + ingress-nginx (idempotent)
make secrets ENV=dev            # writes k8s/overlays/dev/{secrets,mongo}.env (gitignored, mode 600)
make image load deploy ENV=dev  # build, load into kind, apply overlay, wait for rollout
make smoke ENV=dev              # signup → login → vault CRUD through the Ingress
```

Hosts resolve through nip.io, so nothing is added to `/etc/hosts`:

| Environment | Namespace | URL |
|---|---|---|
| dev | `passx-dev` | http://dev.passx.127.0.0.1.nip.io |
| prod | `passx-prod` | http://passx.127.0.0.1.nip.io |

Swagger UI is at `/docs` on either host.

## Make targets

| Target | What it does |
|---|---|
| `cluster-up` / `cluster-down` | create or delete the kind cluster `passx` with all add-ons |
| `secrets ENV=` | generate `secrets.env` (`JWT_SECRET`) and `mongo.env` (Mongo root user and password) for the overlay |
| `image TAG=` | `docker build` the backend as `ghcr.io/souvik-cyclic/passx-backend:TAG` (default `sha-<short>`) with commit, tag, build time, pipeline URL baked in |
| `load TAG=` | `kind load docker-image` so the cluster can run it without a registry |
| `deploy ENV= TAG=` | render the overlay with that tag (in a temp copy, repo stays clean), `kubectl apply`, wait for Mongo and backend rollouts, print `/version` |
| `smoke ENV=` | full user journey against the Ingress host |
| `drift ENV= TAG=` | `kubectl diff` of the rendered overlay against the cluster; exit 1 on drift |
| `netpol-test ENV=` | proves only `app=backend` pods can reach `mongo:27017` |
| `rollback ENV=` | `kubectl rollout undo` the backend Deployment |
| `status ENV=` | pods, HPA, PDB, Ingress and the running version |
| `logs ENV=` | tail backend JSON logs |

## Layout

```
k8s/
  kind/cluster.yaml              kind config: Calico-ready (no default CNI), ports 80/443 → host
  kind/ingress-nginx-values.yaml ingress-nginx on host ports
  base/                          environment-neutral manifests
    backend/                     Deployment, Service, Ingress, ServiceAccount, ConfigMap, NetworkPolicy
    mongo/                       StatefulSet, headless Service, NetworkPolicy
    networkpolicy-default-deny.yaml
  overlays/dev                   namespace passx-dev, 1 replica, debug logs
  overlays/prod                  namespace passx-prod, 2 replicas, HPA 2–4 @70% CPU, PDB minAvailable 1
scripts/
  kind-up.sh  render.sh  deploy.sh  smoke.sh  drift-check.sh  netpol-test.sh  wait-for.sh
```

## Design choices (short form; `docs/decisions.md` has the long form and the alternatives)

- **Deployment for the backend, StatefulSet for Mongo.** The API is stateless; Mongo needs a stable name and its own volume.
- **Three probes.** `startupProbe` on `/health/live` gives Node time to boot; `livenessProbe` restarts a hung process; `readinessProbe` on `/health/ready` pings Mongo and pulls the pod out of the Service when the database is down, without restarting it.
- **Rolling update `maxUnavailable: 0`.** A bad image never takes traffic: the new pod must pass readiness before an old one is removed.
- **Resources.** backend requests 100m/128Mi, limits 500m/256Mi; Mongo 100m/256Mi to 500m/512Mi. Requests make the HPA math and scheduling honest; limits cap a runaway.
- **Scaling and placement.** prod runs an HPA (2–4 pods at 70% CPU) backed by metrics-server, a PDB so voluntary disruptions keep one pod, and preferred anti-affinity across nodes (one node here, so preferred not required). The prod Deployment sets no `replicas` field so `kubectl apply` never fights the HPA; dev patches `replicas: 1`.
- **Config vs secrets.** Non-secret settings live in `base/backend/config.env`, rendered by a `configMapGenerator` with a content hash so any config change rolls the Deployment (and `rollout undo` restores the old ConfigMap too). Secrets are generated locally and injected through `secretGenerator`s: `backend-secrets` (JWT) is hash-suffixed so rotating it rolls the backend; `mongo-secrets` keeps a fixed name on purpose, because `MONGO_INITDB_ROOT_*` only apply when the data directory is first created. Rotating the Mongo password therefore means `mongosh --eval 'db.changeUserPassword(...)'` inside `mongo-0` and then updating `mongo.env`, or deleting the PVC. Both env files are gitignored.
- **Security.** Non-root uid 1000, read-only root filesystem with an `emptyDir` at `/tmp`, all capabilities dropped, `RuntimeDefault` seccomp, no service-account token mounted, namespaces enforce the `restricted` Pod Security Standard. NetworkPolicy: default deny ingress; Mongo accepts only backend pods; backend accepts 3000 only from `ingress-nginx` and 9464 only from `monitoring`. Calico enforces these (kind's default CNI would not).
- **Metrics on a separate port.** `/metrics` listens on 9464, which the Ingress never routes to.
- **Mongo root user.** The app connects as the Mongo root user. Acceptable here because Mongo is single-tenant and reachable only from backend pods; production would create a `readWrite` user on the `passx` database with an init Job.
- **Egress is open.** Policies restrict ingress only; pods may call out (DNS, Jaeger collector, future external APIs). An egress allowlist is the next hardening step.
- **Images.** Never `latest`. The deploy script sets `sha-<short>` on a temp copy of the overlay so git shows the intended state and `make drift` shows the live state.

## Pinned versions

| Component | Version |
|---|---|
| Calico | v3.33.0 (manifest install) |
| metrics-server chart | 3.14.0 (app 0.9.0), `--kubelet-insecure-tls` because kind nodes use self-signed kubelet certs |
| ingress-nginx chart | 4.15.1 (controller 1.15.1) |
| mongo image | `mongo:7` pinned by digest in `base/mongo/statefulset.yaml` |
| kind node image | default for kind v0.33.0 (Kubernetes v1.37) |

## Known limitations

- One node, so anti-affinity is a preference and PVCs are local `hostPath`-backed `standard` storage. Data survives pod restarts but not `make cluster-down`.
- Single Mongo replica, no backups. Production would use a 3-member replica set or a managed service.
- Swagger UI needs inline scripts, so helmet's Content-Security-Policy is disabled application-wide. A production build would serve docs from a separate origin or drop them.
- Images are loaded into kind from the local Docker daemon until the CI pipeline publishes them to GHCR.
