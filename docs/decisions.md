# Decision log

Each entry: what was chosen, what else was considered, and when the other choice would be right. Written for the viva and for anyone who has to change this later.

## Platform

**kind over minikube.** Docker was already installed; kind creates a cluster from one committed YAML in under a minute and `kind load` makes local images usable without a registry. Minikube's advantage is bundled addons and VM isolation, neither needed here. Calico replaces kind's default CNI because kindnet does not enforce NetworkPolicy, and an unenforced policy is decoration.

**Kustomize for our manifests, Helm for other people's.** One Deployment and one StatefulSet do not need a templating language; overlays express the dev/prod difference as small patches on plain YAML. Helm is used to install Prometheus, Loki, Jaeger-adjacent charts and ingress-nginx, where someone else maintains the templates. A Helm chart for PassX would make sense if several teams installed it with different settings.

**Deployment for the backend, StatefulSet for Mongo.** The API keeps no local state, so pods are interchangeable and a rolling update is safe. Mongo needs a stable DNS name and a volume that follows the pod. A single replica is accepted for a demo cluster; production would run a three-member replica set or a managed service.

**Three probes.** Startup probe gives Node time to boot without the liveness probe killing it. Liveness restarts a hung process and nothing else. Readiness pings Mongo and removes the pod from the Service when the database is down, without restarting a healthy process. Alternatives: one probe for everything (restarts pods during a database outage, making it worse) or no readiness (traffic to pods that will 5xx).

**`maxUnavailable: 0`, `maxSurge: 1`.** A bad image can never take traffic because the new pod must pass readiness before an old one is removed. Costs one extra pod of headroom during a rollout. Blue-green or canary would give per-request traffic control, worth it with real users and a traffic-splitting ingress; here rolling plus readiness gives the same safety for a fraction of the moving parts.

**HPA owns the prod replica count.** The prod Deployment sets no `replicas`, so `kubectl apply` never fights the autoscaler and drift checks stay clean. Dev patches `replicas: 1` because it never scales.

**Config and secrets.** Non-secret settings live in git as `config.env`, rendered with a hash suffix so a config change rolls pods and a rollback restores the old config too. Secrets are generated locally and never committed; the deploy job writes them from GitHub Environment secrets. Mongo credentials have their own fixed-name Secret because `MONGO_INITDB_ROOT_*` only apply when the data directory is created, so a hash-suffixed secret would restart Mongo on every JWT rotation without actually changing its password. Sealed Secrets or External Secrets would replace the env files in a multi-machine or GitOps setup.

**Pod hardening.** Non-root uid 1000, read-only root filesystem with an `emptyDir` at `/tmp`, all capabilities dropped, default seccomp, no service account token, namespaces enforcing the `restricted` Pod Security Standard. Each one closes a class of container escape or lateral movement; none of them costs anything for a Node API. The app connects to Mongo as the root user, an accepted shortcut for a single-tenant database behind a NetworkPolicy; a least-privilege `readWrite` user created by an init Job is the production step.

**Metrics on a separate port.** `/metrics` is on 9464, which the Ingress never routes to and NetworkPolicy opens only to the monitoring namespace. A bearer token on `/metrics` would need a secret in two namespaces for the same outcome.

## Delivery

**One pipeline, two workflows.** `ci.yml` runs on GitHub-hosted runners and ends with an image; `cd.yml` runs on a self-hosted runner and ends with that image serving traffic. The split matches the trust boundary: GitHub-hosted runners never hold cluster credentials, and the self-hosted runner only runs for pushes from this repository.

**Self-hosted runner instead of Argo CD.** GitHub-hosted runners cannot reach a cluster on a laptop. Argo CD (pull-based) solves the same problem and adds drift detection and a UI, but it introduces a second system to explain and a Git write-back for image tags. The runner keeps a single code path, `scripts/deploy.sh`, for local and pipeline deploys, and makes the prod approval a native GitHub Environment feature. Argo CD is the right answer when the cluster is remote or several teams deploy.

**Image tags are commits.** Only `sha-<7>` tags are deployed, never `latest`. `GET /version` reports the commit, tag, build time and run URL, so "what is running" is answered by the application. Semver tags are added on `v*` git tags for humans.

**Checks before build, build before deploy.** Lint, tests, gitleaks, `pnpm audit`, manifest validation and shellcheck all gate the image build; Trivy gates the push. A commit that fails any check never produces a deployable artifact.

**Automatic dev, approved prod.** dev exists to be broken and deploys on every green build. prod waits for a human click because the cost of a bad release is user-facing. The approval is a GitHub Environment reviewer, visible in the run and in the deployment history.

**Automatic rollback.** If the rollout stalls, the version assertion fails, the smoke test fails or the drift check fails, the job runs `kubectl rollout undo` and reports the restored tag. Because `maxUnavailable: 0` never let the bad release take traffic, users see nothing.

**Pinned actions.** Every third-party action is pinned to a commit SHA with the version in a comment; Dependabot proposes bumps. A tag can be moved by a compromised maintainer, a SHA cannot.

## Observability

**Prometheus + Grafana, Loki, Jaeger.** Metrics say that something is slow or failing, logs say what the code said, traces say where the time went. All three are in one Grafana with the `traceId` from a log line linking to the trace. Alternatives: an ELK stack (heavier), a hosted SaaS (not free, not local).

**SLO and alerts.** 99% success and p95 under 300 ms, computed from the app's own histogram with a 0.3 s bucket so the quantile is exact at the threshold. Four alerts: error ratio, latency, Mongo down, backend absent. Each has a runbook entry with the action to take. Alertmanager has no paging receiver here; that is a one-line change for a real on-call tool.

**Structured logs.** pino JSON with string levels, request id (validated, never echoed raw), route, status and `traceId`. Health and metrics traffic logs at debug when healthy so the info stream is readable; a failing probe logs at error.

**Tracing is opt-in.** The OpenTelemetry SDK is loaded only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, so tests and pods without a collector pay nothing (about 50 MB RSS and half a second otherwise).

## Things deliberately not done

- Terraform or any cloud resources: the course allows local Kubernetes, and there is nothing to provision.
- Canary or feature flags: no traffic-splitting layer and no user population to split.
- Mongo replica set and backups: documented as the production step.
- Egress NetworkPolicy: ingress restriction is what the spec requires; egress allowlists are the next hardening step.
- Default-deny in the `monitoring` namespace: Loki and Jaeger are fenced; Prometheus and Alertmanager UIs are still open to in-cluster pods. See `k8s/monitoring/README.md`.
- Redis-backed rate limiting: per-pod in-memory limits are documented as multiplying with the HPA.
- Deploy by image digest: CD pulls `sha-<7>`, a tag only CI writes to a package only CI pushes. Resolving the digest from the full-SHA tag (or verifying a cosign signature) before `kind load` is the next supply-chain step; it was left out to keep `/version`, the deploy script and the drift check on one tag format.
