# syntax=docker/dockerfile:1.7

# ----- builder -----
FROM node:20-alpine AS builder
WORKDIR /repo

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Workspace manifests
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --no-frozen-lockfile --filter "@cinenova/api..."

# Compile workspace packages BEFORE the api so that nest build can resolve
# them through their package.json "main" → dist/index.js entries.
RUN pnpm --filter "@cinenova/db" db:generate || true
RUN pnpm --filter "@cinenova/shared" build
RUN pnpm --filter "@cinenova/db" build
RUN pnpm --filter "@cinenova/api" build

# ----- runner -----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl tini

# Copy the resolved workspace from the builder. Free-tier sized; simpler than
# pnpm deploy (which would require a lockfile).
COPY --from=builder /repo /app

WORKDIR /app/apps/api

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
