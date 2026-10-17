# PassX local DevOps workflow. Run `make help` for the target list.
SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

ENV ?= dev
ifeq (,$(filter $(ENV),dev prod))
$(error ENV must be dev or prod, got '$(ENV)')
endif
IMAGE ?= ghcr.io/souvik-cyclic/passx-backend
TAG ?= sha-$(shell git rev-parse --short HEAD)
CLUSTER := passx
NS := passx-$(ENV)
HOST_dev := dev.passx.127.0.0.1.nip.io
HOST_prod := passx.127.0.0.1.nip.io
HOST := $(HOST_$(ENV))

.PHONY: help tools-check cluster-up cluster-down secrets image load deploy smoke drift netpol-test rollback status logs

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

tools-check: ## Verify kind, kubectl, kustomize, helm, docker are installed
	@for t in kind kubectl kustomize helm docker; do \
	  command -v $$t >/dev/null || { echo "missing: $$t"; exit 1; }; \
	done
	@kind version; kubectl version --client | head -1; kustomize version; helm version --short; docker --version

cluster-up: ## Create the kind cluster with Calico, metrics-server, ingress-nginx (idempotent)
	scripts/kind-up.sh

cluster-down: ## Delete the kind cluster
	kind delete cluster --name $(CLUSTER)

secrets: ## Generate k8s/overlays/$(ENV)/{secrets,mongo}.env if missing (never committed)
	@umask 077; d=k8s/overlays/$(ENV); \
	if [ -f $$d/secrets.env ]; then echo "$$d/secrets.env exists"; else \
	  printf 'JWT_SECRET=%s\n' "$$(openssl rand -base64 48 | tr -d '\n=/+')" > $$d/secrets.env; echo "wrote $$d/secrets.env"; fi; \
	if [ -f $$d/mongo.env ]; then echo "$$d/mongo.env exists"; else \
	  printf 'MONGO_ROOT_USERNAME=passx\nMONGO_ROOT_PASSWORD=%s\n' "$$(openssl rand -base64 24 | tr -d '\n=/+')" > $$d/mongo.env; echo "wrote $$d/mongo.env"; fi

image: ## Build the backend image as $(IMAGE):$(TAG)
	docker build \
	  --build-arg APP_COMMIT=$$(git rev-parse HEAD) \
	  --build-arg APP_IMAGE_TAG=$(TAG) \
	  --build-arg APP_BUILD_TIME=$$(date -u +%FT%TZ) \
	  --build-arg APP_PIPELINE_URL=local \
	  -t $(IMAGE):$(TAG) backend

load: ## Load $(IMAGE):$(TAG) into the kind cluster
	kind load docker-image $(IMAGE):$(TAG) --name $(CLUSTER)

deploy: ## Deploy overlay $(ENV) with image tag $(TAG) and wait for rollout
	scripts/deploy.sh $(ENV) $(TAG)

smoke: ## Run the user-journey smoke test against $(ENV)
	scripts/smoke.sh http://$(HOST)

drift: ## Diff the live cluster against the $(ENV) overlay (exit 1 on drift)
	scripts/drift-check.sh $(ENV) $(TAG)

netpol-test: ## Prove Mongo is reachable only from backend pods in $(ENV)
	scripts/netpol-test.sh $(ENV)

rollback: ## Roll the backend Deployment in $(ENV) back one revision
	kubectl -n $(NS) rollout undo deploy/backend
	kubectl -n $(NS) rollout status deploy/backend --timeout=180s

status: ## Show pods, HPA, PDB and the running version in $(ENV)
	kubectl -n $(NS) get deploy,sts,pods,hpa,pdb,ingress -o wide
	@curl -s http://$(HOST)/version; echo

logs: ## Tail backend logs in $(ENV)
	kubectl -n $(NS) logs deploy/backend -f --tail=100
