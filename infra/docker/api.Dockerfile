# syntax=docker/dockerfile:1.7

# ----- builder -----
FROM node:20-alpine AS builder
WORKDIR /repo

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Workspace manifests. pnpm-lock.yaml is intentionally not committed; install
# runs with --no-frozen-lockfile and resolves at build time.
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --no-frozen-lockfile --filter "@cinenova/api..."
RUN pnpm --filter "@cinenova/db" db:generate || true
RUN pnpm --filter "@cinenova/api" build

# ----- runner -----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache openssl tini

# Copy the resolved workspace from the builder. Free-tier sized; simpler than
# pnpm deploy (which would require a lockfile).
COPY --from=builder /repo /app

WORKDIR /app/apps/api

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
