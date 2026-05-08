<div align="center">

# CineNova

**A full-stack cinema booking platform with realtime seat-lock, role-based admin tooling, and an AI assistant grounded in your live catalog.**

[![CI](https://github.com/dellacee/cinenova/actions/workflows/ci.yml/badge.svg)](https://github.com/dellacee/cinenova/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Postgres](https://img.shields.io/badge/Postgres-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)

*Where every seat tells a story.*

</div>

---

## Why this project exists

CineNova is a portfolio project that demonstrates **production-grade engineering**, not a clone. The booking flow, admin tooling, and AI features are inspired by real cinema operators, but every line of code, every brand asset, and every design choice here is original. Movie metadata is sourced legitimately from the public TMDb API.

What it tries to prove:

- **Concurrency correctness.** Seat selection is the textbook race condition. CineNova uses an atomic Redis-backed pessimistic lock with a partial unique index on Postgres as the inviolable backstop.
- **Domain discipline.** Price snapshots, soft delete, optimistic locking on metadata, idempotent webhooks, append-only audit trail.
- **Clean cross-runtime boundaries.** TypeScript (Next.js + NestJS) handles transactional UX. Python (FastAPI) handles AI. They communicate over HTTP with HMAC-signed service tokens.
- **AI that is grounded.** RAG over the actual movie catalog, not a generic GPT wrapper. Hybrid recommender (content-based + collaborative). Provider abstraction so Gemini and Ollama are interchangeable.
- **Operability.** One-command local boot, structured logs, traces, health checks, free-tier cloud deploy.

## Architecture at a glance

```
                         BROWSER (User / Admin)
                                  |
                  HTTPS  +-------------------+  WSS (Socket.IO)
                         |                   |
                         v                   v
                +--------------------+   +--------------------+
                |  Next.js 15 (web)  |   |  Realtime channel  |
                |  SSR/RSC + Auth.js |   |  (NestJS gateway)  |
                +---------+----------+   +---------+----------+
                          | REST + Zod              |
                          v                         |
                +-------------------------------------+
                |        NestJS API (apps/api)         |
                |  modules: auth, movies, showtimes,   |
                |  seats, bookings, payments, admin..  |
                |  JWT + RBAC + OpenAPI 3.1            |
                +--+--------+---------+---------+------+
                   |        |         |         |
                   v        v         v         v
              +--------+ +-----+ +------+ +-------------+
              |Postgres| |Redis| |MinIO | | FastAPI AI  |
              |+pgvec  | |     | |  S3  | |  (apps/ai)  |
              |Prisma  | |lock | |poster| |chat/recom.. |
              +--------+ |queue| +------+ +------+------+
                         +-----+                 |
                                          +------+------+
                                          v             v
                                    +---------+   +-----------+
                                    |LLM (G/O)|   | TMDb API  |
                                    +---------+   +-----------+
```

See [`docs/superpowers/specs/2026-05-08-cinenova-design.md`](./docs/superpowers/specs/2026-05-08-cinenova-design.md) for the full specification.

## Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Next.js 15** (App Router, RSC) + **Tailwind** + **shadcn/ui** | SEO, server actions, modern de-facto |
| Realtime | **Socket.IO** | Seat-lock broadcast, low-latency push |
| API | **NestJS 10** + **Prisma** + **Zod** | Modular DDD, type-safe contracts |
| AI service | **FastAPI** + **pydantic v2** + **httpx** | Idiomatic Python, async, easy to deploy |
| LLM | **Gemini Flash** (default, free tier) / **Ollama** (local fallback) via Strategy abstraction | Zero-cost demo, swap in one env var |
| DB | **Postgres 16** + **pgvector** | Source of truth + vector search in one |
| Cache / lock / queue | **Redis 7** + **BullMQ** | Atomic primitives, durable queues |
| Object storage | **MinIO** (dev) / **R2** (prod) | S3 protocol, free tier |
| Auth | **Auth.js v5** | Email/password + Google OAuth + JWT |
| Payment (sandbox) | **VNPay** + **Stripe** test (adapter pattern) | VN-locale relevance + global familiarity |
| Email | **MailHog** (dev) / **Resend** (prod) | |
| Tests | **Vitest** + **Playwright** + **pytest** + **k6** | Unit, integration, E2E, load |
| CI/CD | **GitHub Actions** + **GHCR** | Free, native to GitHub |
| Observability | **Pino** + **Sentry** + **OpenTelemetry** | Structured logs, traces, errors |
| Monorepo | **Turborepo** + **pnpm** workspaces | Fast incremental builds |

## Quick start

```bash
# 1. Clone
git clone https://github.com/dellacee/cinenova.git
cd cinenova

# 2. Configure
cp .env.example .env
# fill in GEMINI_API_KEY (free at https://aistudio.google.com/apikey)
# fill in TMDB_API_KEY (free at https://www.themoviedb.org/settings/api)

# 3. Boot infra (postgres, redis, minio, mailhog)
pnpm docker:up

# 4. Install + migrate + seed
pnpm install
pnpm db:migrate
pnpm db:seed

# 5. Run all apps
pnpm dev
```

Open:

- **Web** — http://localhost:3000
- **API docs** — http://localhost:4000/docs
- **AI** — http://localhost:5000/docs
- **MailHog** — http://localhost:8025
- **MinIO console** — http://localhost:9001

Demo credentials (after seeding):

```
Admin:   admin@cinenova.local   / Admin123!
User:    demo@cinenova.local    / Demo1234!
```

## Project structure

```
cinenova/
├── apps/
│   ├── web/            # Next.js 15 (public + admin)
│   ├── api/            # NestJS (auth, catalog, booking, payment)
│   └── ai/             # FastAPI (chat, recommend, summarize)
├── packages/
│   ├── db/             # Prisma schema + migrations + seed
│   ├── shared/         # Zod schemas shared web ↔ api
│   ├── ui/             # shadcn components + design tokens
│   └── config/         # eslint / prettier / tsconfig presets
├── docs/
│   ├── superpowers/specs/   # Design specifications
│   ├── adr/                 # Architecture Decision Records
│   ├── api/                 # OpenAPI snapshot
│   └── runbook/             # Ops cheatsheet
├── infra/
│   ├── docker/         # Per-service Dockerfiles
│   └── docker-compose.yml
└── scripts/            # dev helpers
```

## Development workflow

```bash
pnpm dev              # run all apps in parallel
pnpm lint             # eslint + ruff
pnpm typecheck        # tsc + mypy
pnpm test             # unit tests across all packages
pnpm test:e2e         # Playwright (requires dev server)
pnpm format           # prettier + black
pnpm db:migrate       # apply Prisma migrations
pnpm db:seed          # populate dev data
```

Commits use **Conventional Commits** (enforced by commitlint + husky).

## Roadmap

This repo grows by milestone. Each milestone is a single commit prefixed with its tag:

| Milestone | Status | Description |
|---|---|---|
| M0 | done | Monorepo + tooling + lightweight CI |
| M1 | done | Prisma schema (24 entities) + pgvector + seed |
| M2 | done | Auth + movies + theaters + showtimes (NestJS) |
| M3 | done | Booking + Redis seat-lock + VNPay sandbox |
| M4 | done | Public site: homepage, browse, detail, auth |
| M5 | done | Realtime seat picker + checkout + e-ticket QR |
| M6 | done | Admin dashboard CRUD + audit log viewer |
| M7 | done | FastAPI chatbot (RAG) + hybrid recommender |
| M8 | done | Web integration: chat widget + recommend shelf + review summary |
| M9 | done | Docker Compose full stack + Vercel/Render deploy configs |
| M10 | done | Tests scaffold + 7 ADRs + final docs |

## Documentation

- [Design specification](./docs/superpowers/specs/2026-05-08-cinenova-design.md)
- [Implementation plan](./docs/superpowers/specs/2026-05-08-cinenova-implementation-plan.md)
- [Architecture Decision Records](./docs/adr/)
- [Operations runbook](./docs/runbook/)

## License

MIT — see [LICENSE](./LICENSE). Movie metadata © TMDb (used per their terms of service).

---

<div align="center">
<sub>Built by <a href="https://github.com/dellacee">dellacee</a></sub>
</div>
