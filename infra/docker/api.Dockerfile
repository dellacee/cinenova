# syntax=docker/dockerfile:1.7

# ----- builder -----
FROM node:20-alpine AS builder
WORKDIR /repo

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile --filter "@cinenova/api..."
RUN pnpm --filter "@cinenova/db" db:generate || true
RUN pnpm --filter "@cinenova/api" build

# Prune dev deps for the runtime image.
RUN pnpm --filter "@cinenova/api" deploy --prod /pruned

# ----- runner -----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 api

COPY --from=builder --chown=api:nodejs /pruned ./
COPY --from=builder --chown=api:nodejs /repo/packages/db/prisma ./prisma

USER api
EXPOSE 4000

CMD ["node", "dist/main.js"]
