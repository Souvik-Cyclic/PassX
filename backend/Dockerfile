# syntax=docker/dockerfile:1

# ---------- build stage ----------
FROM node:24-alpine AS builder

WORKDIR /app

# Pin pnpm to the version declared in package.json "packageManager".
RUN npm install -g pnpm@12.4.1 && npm cache clean --force

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# ---------- runtime stage ----------
FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Production deps only. pnpm is installed, used and removed inside one layer so
# neither pnpm itself, its content-addressable store nor the npm cache ship in
# the final image; node_modules is the only thing this layer keeps.
RUN npm install -g pnpm@12.4.1 && \
    pnpm install --prod --frozen-lockfile && \
    rm -rf "$(pnpm store path)" && \
    npm uninstall -g pnpm && \
    npm cache clean --force && \
    rm -rf /root/.cache /root/.npm /root/.local && \
    chown -R node:node /app

COPY --from=builder --chown=node:node /app/dist ./dist

# Build metadata; CI passes these, local builds fall back to "unknown".
ARG APP_COMMIT=unknown
ARG APP_IMAGE_TAG=unknown
ARG APP_BUILD_TIME=unknown
ARG APP_PIPELINE_URL=unknown

ENV APP_COMMIT=$APP_COMMIT \
    APP_IMAGE_TAG=$APP_IMAGE_TAG \
    APP_BUILD_TIME=$APP_BUILD_TIME \
    APP_PIPELINE_URL=$APP_PIPELINE_URL

LABEL org.opencontainers.image.title="passx-backend" \
      org.opencontainers.image.source="https://github.com/Souvik-Cyclic/PassX" \
      org.opencontainers.image.revision="$APP_COMMIT" \
      org.opencontainers.image.version="$APP_IMAGE_TAG" \
      org.opencontainers.image.created="$APP_BUILD_TIME" \
      org.opencontainers.image.url="$APP_PIPELINE_URL"

# Run unprivileged (node = uid 1000 in the official image).
USER node

# 3000 = HTTP API, 9464 = Prometheus metrics (METRICS_PORT default).
EXPOSE 3000 9464

# No HEALTHCHECK: Kubernetes probes own liveness/readiness.
CMD ["node", "dist/main.js"]
