# CineNova — Implementation Plan

| Field | Value |
|---|---|
| **Spec ref** | `2026-05-08-cinenova-design.md` |
| **Date** | 2026-05-08 |
| **Strategy** | Milestone-driven, one commit per milestone, conventional commits, push after each milestone |

---

## How to read this plan

Each milestone has:
- **Goal** — what will exist when this milestone is done
- **Files** — concrete paths created/modified
- **Tests** — verification checklist
- **Commit** — exact commit message convention
- **Done when** — acceptance criteria

The agent executes milestones in order. After each milestone, `git add . && git commit -m "..." && git push origin main`.

---

## M0 — Repo scaffold & tooling

**Goal:** Empty but production-ready monorepo skeleton. `pnpm install` succeeds. CI runs on push (no jobs fail). README explains project.

**Files:**
- `package.json` (root, private, workspaces)
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `.eslintrc.cjs`, `.prettierrc`, `.editorconfig`, `.nvmrc`
- `.gitignore`, `.gitattributes`
- `.env.example`
- `LICENSE` (MIT)
- `README.md` (full overview, architecture diagram, quick start, tech stack table, screenshots placeholder, demo URL placeholder)
- `commitlint.config.cjs`, `.husky/pre-commit`, `.husky/commit-msg`
- `.github/workflows/ci.yml` (lint + typecheck on PR)
- `packages/config/eslint/index.cjs`
- `packages/config/tsconfig/base.json`
- `packages/config/tsconfig/nestjs.json`
- `packages/config/tsconfig/nextjs.json`
- `packages/config/prettier/index.cjs`

**Done when:** `pnpm install` clean. `pnpm lint` exits 0 (no source yet, but lint config valid). README renders correctly on GitHub.

**Commit:** `chore: init monorepo with turborepo + pnpm workspaces (M0)`

---

## M1 — Database schema & seed

**Goal:** Postgres + pgvector schema fully migrated. `pnpm db:seed` produces a working dataset (5 theaters, 30 TMDb movies, 200 showtimes spread across the next 14 days, 20 concession items, 10 vouchers, 1 admin user).

**Files:**
- `packages/db/package.json`
- `packages/db/prisma/schema.prisma` (all 16 entities + enums + indexes)
- `packages/db/prisma/migrations/0001_init/migration.sql`
- `packages/db/prisma/migrations/0002_pgvector/migration.sql`
- `packages/db/prisma/migrations/0003_partial_unique_seat/migration.sql`
- `packages/db/seed/index.ts` (orchestrator)
- `packages/db/seed/tmdb.ts` (fetch from TMDb top movies)
- `packages/db/seed/theaters.ts`
- `packages/db/seed/showtimes.ts`
- `packages/db/seed/concessions.ts`
- `packages/db/seed/vouchers.ts`
- `packages/db/src/index.ts` (PrismaClient singleton export)
- `infra/docker-compose.yml` (postgres + redis + minio + mailhog services only)
- `docs/adr/0003-pgvector-vs-qdrant.md`

**Tests:**
- Run `pnpm db:migrate` against local Docker postgres → no error.
- Run `pnpm db:seed` → assert row counts.

**Done when:** Postgres has populated tables; `psql -c "SELECT COUNT(*) FROM movies"` returns 30.

**Commit:** `feat(db): prisma schema + pgvector + seed dataset (M1)`

---

## M2 — NestJS API: auth + catalog + scheduling

**Goal:** API serving auth (signup, login, /me), and read-only endpoints for movies, theaters, showtimes. Admin endpoints (CRUD) protected by RolesGuard. OpenAPI at `/docs`.

**Files (NestJS modular):**
- `apps/api/package.json`, `tsconfig.json`, `nest-cli.json`
- `apps/api/src/main.ts` (bootstrap + Swagger + Pino logger + helmet + cors)
- `apps/api/src/app.module.ts`
- `apps/api/src/infra/prisma.module.ts`, `prisma.service.ts`
- `apps/api/src/infra/redis.module.ts`, `redis.service.ts`
- `apps/api/src/infra/config/config.module.ts` (zod-validated env)
- `apps/api/src/common/guards/jwt.guard.ts`, `roles.guard.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`, `roles.decorator.ts`, `public.decorator.ts`
- `apps/api/src/common/filters/all-exceptions.filter.ts`
- `apps/api/src/common/interceptors/audit.interceptor.ts`
- `apps/api/src/modules/auth/{auth.module,auth.controller,auth.service,strategies/jwt.strategy,strategies/google.strategy,dto/*}.ts`
- `apps/api/src/modules/movies/{movies.module,movies.controller,movies.service,dto/*}.ts`
- `apps/api/src/modules/theaters/...`
- `apps/api/src/modules/showtimes/...`
- `apps/api/src/modules/admin/admin.module.ts` (re-exports CRUD endpoints under `/admin/*`)
- `apps/api/test/auth.e2e-spec.ts`, `movies.e2e-spec.ts`
- `packages/shared/src/schemas/{auth,movie,theater,showtime}.ts` (Zod, exported to web)

**Tests:**
- `pnpm --filter api test` — unit tests on services with mocked PrismaClient.
- `pnpm --filter api test:e2e` — Testcontainers postgres+redis.

**Done when:** `curl /api/movies` returns seed data. `/docs` shows full OpenAPI. Role middleware blocks USER from `/admin/*`.

**Commit:** `feat(api): auth + movies/theaters/showtimes modules + RBAC (M2)`

---

## M3 — Booking, seat-lock, payment

**Goal:** Full booking lifecycle works against real Postgres + Redis. Socket.IO seat-lock broadcasts. VNPay sandbox webhook closes the loop.

**Files:**
- `apps/api/src/modules/seats/seats.module.ts`, `seats.gateway.ts` (Socket.IO), `seat-lock.service.ts`
- `apps/api/src/modules/bookings/{bookings.module,bookings.controller,bookings.service,booking.state-machine.ts,dto/*}.ts`
- `apps/api/src/modules/payments/{payments.module,payments.controller,vnpay.adapter.ts,stripe.adapter.ts,payment-provider.interface.ts}.ts`
- `apps/api/src/modules/vouchers/...`
- `apps/api/src/modules/concessions/...`
- `apps/api/src/jobs/expire-bookings.job.ts` (BullMQ)
- `apps/api/src/jobs/booking-confirmed-email.job.ts`
- `apps/api/src/infra/bullmq/bullmq.module.ts`
- `apps/api/src/infra/qr/qr.service.ts`
- `apps/api/test/booking.e2e-spec.ts` (concurrency: 10 users 1 seat)
- `apps/api/test/payment-webhook.e2e-spec.ts` (idempotency)
- `docs/adr/0002-redis-seat-lock-vs-db-row-lock.md`

**Tests:**
- 10 concurrent SETNX → 1 winner.
- Webhook delivered twice → 1 booking confirmed.
- Voucher race (5 left, 10 buyers) → exactly 5 succeed.
- Pending booking after 10 min → auto EXPIRED.

**Done when:** End-to-end booking via curl (signup → draft → confirm → simulate webhook → fetch booking with QR).

**Commit:** `feat(api): booking flow with seat-lock + vnpay webhook (M3)`

---

## M4 — Web: public pages

**Goal:** Beautiful Next.js 15 site rendering homepage, movie detail, browse, login/signup, profile.

**Files:**
- `apps/web/package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- `apps/web/app/layout.tsx` (root, fonts Geist, theme provider)
- `apps/web/app/(public)/layout.tsx` (header, footer, chat widget mount)
- `apps/web/app/(public)/page.tsx` (Hero + Now Showing carousel + Coming Soon + For You stub)
- `apps/web/app/(public)/movies/page.tsx` (browse with filters)
- `apps/web/app/(public)/movies/[slug]/page.tsx` (detail + showtime list + reviews stub)
- `apps/web/app/(public)/auth/{signin,signup}/page.tsx`
- `apps/web/app/(public)/account/{layout,page,bookings/page}.tsx`
- `apps/web/app/api/auth/[...nextauth]/route.ts` (Auth.js v5)
- `apps/web/components/{Header,Footer,MovieCard,MovieCarousel,HeroBanner,ThemeToggle}.tsx`
- `apps/web/lib/{api-client,auth,utils,fonts}.ts`
- `packages/ui/components/*` (shadcn: button, card, dialog, input, dropdown, sheet, sonner)
- `packages/ui/styles/tokens.css`

**Tests:** Playwright smoke: navigate homepage → click movie → see detail.

**Done when:** Visiting `/` shows polished homepage with seed data; `/movies/[slug]` shows detail; signup + login work end-to-end.

**Commit:** `feat(web): public site — homepage + browse + detail + auth (M4)`

---

## M5 — Web: booking flow + seat picker

**Goal:** Real-time seat picker using Socket.IO; complete checkout against M3 endpoints; success page with QR.

**Files:**
- `apps/web/app/(public)/booking/[showtimeId]/page.tsx`
- `apps/web/app/(public)/booking/[showtimeId]/checkout/page.tsx`
- `apps/web/app/(public)/booking/[bookingId]/success/page.tsx`
- `apps/web/components/booking/{SeatPicker,SeatLegend,PriceSummary,ComboPicker,VoucherInput,QrTicket}.tsx`
- `apps/web/lib/realtime/socket.ts`, `useSeatLock.ts`
- `apps/web/lib/booking/{client,types}.ts`
- `apps/web/test/booking.spec.ts` (Playwright happy path)

**Tests:** Playwright booking E2E: pick seat → confirm → mock webhook → see ticket.

**Done when:** Live demo: two browsers on same showtime see each other's seat selections in <500ms.

**Commit:** `feat(web): seat picker + checkout + ticket QR (M5)`

---

## M6 — Admin dashboard

**Goal:** Authenticated `/admin` area with CRUD for movies, theaters, rooms, showtimes, vouchers, concessions. Audit log viewer.

**Files:**
- `apps/web/app/(admin)/layout.tsx` (sidebar, role check)
- `apps/web/app/(admin)/page.tsx` (dashboard stats)
- `apps/web/app/(admin)/movies/{page,new/page,[id]/edit/page}.tsx`
- `apps/web/app/(admin)/theaters/...`
- `apps/web/app/(admin)/rooms/...`
- `apps/web/app/(admin)/showtimes/...`
- `apps/web/app/(admin)/vouchers/...`
- `apps/web/app/(admin)/concessions/...`
- `apps/web/app/(admin)/audit/page.tsx`
- `apps/web/components/admin/{DataTable,FormBuilder,SeatLayoutEditor}.tsx`

**Tests:** Playwright admin smoke: login as admin → create movie → see in public catalog.

**Done when:** Admin can perform full lifecycle from UI; every action visible in `/admin/audit`.

**Commit:** `feat(admin): full CRUD dashboard + audit log viewer (M6)`

---

## M7 — FastAPI AI service

**Goal:** Standalone Python service implementing chat/recommend/summarize/moderate with Gemini default + Ollama fallback.

**Files:**
- `apps/ai/pyproject.toml` (uv-managed)
- `apps/ai/app/main.py`
- `apps/ai/app/core/{config,db,redis,security}.py`
- `apps/ai/app/providers/{base,gemini,ollama,factory}.py`
- `apps/ai/app/providers/embedder.py`
- `apps/ai/app/pipelines/{rag,recommender,summarizer,moderator}.py`
- `apps/ai/app/routers/{chat,recommend,summarize,moderate,health}.py`
- `apps/ai/app/schemas/*.py` (pydantic v2)
- `apps/ai/tests/{test_rag,test_recommender,test_providers}.py`
- `infra/docker/ai.Dockerfile`
- `docs/adr/0005-llm-provider-strategy.md`

**Tests:** pytest with mocked LLM; integration test with seeded movies.

**Done when:** `curl POST /ai/chat` streams a coherent answer about a seeded movie.

**Commit:** `feat(ai): fastapi service with gemini/ollama providers + rag (M7)`

---

## M8 — AI integration in web

**Goal:** Chat widget visible on all public pages, `For You` section on homepage uses recommend endpoint, movie detail shows AI review summary.

**Files:**
- `apps/web/components/ai/{ChatWidget,ChatMessage,ChatInput,RecommendShelf,ReviewSummaryCard}.tsx`
- `apps/web/lib/ai/{client,sse,types}.ts`
- `apps/api/src/modules/ai-proxy/{ai-proxy.module,ai-proxy.controller,ai-proxy.service}.ts` (rate-limited proxy)

**Tests:** Playwright: open chat, ask "phim hành động tối nay" → assistant streams a list referencing real seed showtimes.

**Done when:** Chat works end-to-end; recommendations render; review summaries appear.

**Commit:** `feat(web): chat widget + recommendation shelf + review summary (M8)`

---

## M9 — Infrastructure & deployment

**Goal:** `docker compose up` boots the whole stack; production deploy targets configured.

**Files:**
- `infra/docker/web.Dockerfile`
- `infra/docker/api.Dockerfile`
- `infra/docker/ai.Dockerfile`
- `infra/docker-compose.yml` (full stack: web, api, ai, postgres, redis, minio, mailhog)
- `infra/docker-compose.prod.yml`
- `.github/workflows/docker-publish.yml`
- `vercel.json`
- `render.yaml`
- `docs/runbook/deploy.md`

**Tests:** `docker compose up -d && wait-for-it && curl http://localhost:3000` returns 200.

**Done when:** Single command boots everything; live demo URLs functional.

**Commit:** `chore(infra): docker compose full stack + deploy configs (M9)`

---

## M10 — Tests, coverage, polish

**Goal:** All test suites green in CI; coverage badges in README; ADRs complete; screenshots in README.

**Files:**
- `.github/workflows/e2e.yml`
- `apps/api/test/k6/seat-contention.js`
- Coverage configs (vitest.config, pytest.ini)
- `docs/adr/0001-turborepo-vs-nx.md` ... `0007-conventional-commits.md`
- `docs/runbook/{local-dev,troubleshooting,backup-restore}.md`
- README updates: badges, screenshots, demo link

**Done when:** GitHub Actions all green; README has shields.io badges (CI status, coverage, license, last commit, top language).

**Commit:** `test: e2e + k6 + coverage + final docs polish (M10)`

---

## Execution rules for the agent

1. Each milestone is a single PR-style commit; do not interleave.
2. Run lint + typecheck before commit; fix all errors.
3. After commit: `git push origin main`. Verify the workflow run started.
4. If a milestone hits a real blocker (missing API key, broken upstream), document the blocker in `docs/runbook/blockers.md` and proceed with stub.
5. Skip nothing in the file list above without explicit replacement note in the commit body.
6. Each milestone's commit body lists the entities/components added.
