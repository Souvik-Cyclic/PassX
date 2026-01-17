FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

COPY .env .env

EXPOSE 3000

CMD ["node", "dist/main"]
