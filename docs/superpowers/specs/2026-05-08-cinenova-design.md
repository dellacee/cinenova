# CineNova — Design Specification

| Field | Value |
|---|---|
| **Project name** | CineNova |
| **Repo** | https://github.com/dellacee/cinenova |
| **Local path** | `D:\cinestar` |
| **Author** | dellacee |
| **Date** | 2026-05-08 |
| **Status** | Approved (brainstorm phase) |
| **Type** | Personal portfolio project (CV) |

---

## 1. Executive Summary

CineNova is a full-stack cinema booking web application built as a portfolio project. It demonstrates production-grade engineering across three runtimes (Node.js, Python, browser), realtime concurrency control, role-based admin tooling, and AI-augmented user experience (chatbot, recommendation, review summarization).

The booking flow (movies → showtime → seats → checkout → e-ticket) is inspired by Vietnamese cinema operators but ships under an original brand and original assets, sourced legitimately from public APIs (TMDb).

The system is a **two-runtime monorepo**: a TypeScript stack (Next.js + NestJS + Prisma + Postgres + Redis) for transactional/UX concerns, and a Python service (FastAPI) for AI pipelines, communicating over HTTP with HMAC-signed service tokens.

## 2. Goals & Non-Goals

### Goals (must)

1. End-to-end booking happy path: browse → pick showtime → pick seat → checkout (sandbox payment) → e-ticket QR.
2. Realtime seat-lock with sub-second feedback across concurrent users.
3. Role-based admin dashboard with full CRUD on Movies, Theaters, Rooms, Seats, Showtimes, Vouchers, Concessions.
4. AI chatbot able to answer movie/showtime questions over the actual catalog (RAG).
5. Personalized "For You" recommendations on the homepage.
6. AI-generated review summaries on movie detail pages.
7. Open-source, MIT-licensed, single-command local boot (`docker compose up`).
8. Live demo deployed at zero cost (Vercel + Render/Railway free + Neon + Upstash).
9. Conventional Commits history that demonstrates milestone progression.

### Non-Goals (explicitly out of scope)

- Real money payments (sandbox only).
- Multi-tenant SaaS isolation.
- Native mobile apps.
- Internationalization beyond Vietnamese + English copy.
- Loyalty tier system (deferred to Tier 3 backlog).
- Multi-region deployment.
- Production-grade SOC2/PCI compliance.

## 3. Success Criteria

A recruiter cloning the repo can:

1. Run `docker compose up` and have the entire stack working in under 5 minutes.
2. Read a clear `README.md` with architecture diagram, screenshots, and live demo URL.
3. Browse a coherent commit history grouped by milestone using Conventional Commits.
4. Click into the live demo, sign up, book a seat, see the AI chatbot, and access an admin demo account.
5. Inspect tests (Vitest + pytest + Playwright) all green in CI badge.
6. Find at least one ADR (Architecture Decision Record) per non-obvious decision.

## 4. Background & Motivation

A senior reviewer assessing a cinema-booking portfolio project typically looks for:

- **Concurrency correctness** in seat selection (the textbook race condition).
- **Domain modeling discipline** (price snapshots, soft delete, audit trail).
- **Cross-runtime communication** done correctly (no leaked secrets, no chatty calls).
- **AI integration that is grounded**, not bolted on (RAG over actual data, not a generic GPT wrapper).
- **Operability** (logs, traces, health checks, sane configs).

CineNova targets all five.

## 5. High-Level Architecture

### 5.1 Component diagram

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
              |Prisma  | |lock | |poster| |chat/recommend|
              +--------+ |queue| +------+ +------+------+
                         +-----+                 |
                                          +------+------+
                                          v             v
                                    +---------+   +-----------+
                                    |LLM (G/O)|   | TMDb API  |
                                    +---------+   +-----------+

External: VNPay sandbox, Resend, Sentry, OpenTelemetry
```

### 5.2 Service inventory

| Service | Runtime | Port | Responsibility |
|---|---|---|---|
| `apps/web` | Node 20 / Next.js 15 | 3000 | Public site, admin dashboard, SSR/RSC |
| `apps/api` | Node 20 / NestJS 10 | 4000 | Domain API, auth, realtime gateway, jobs |
| `apps/ai` | Python 3.12 / FastAPI | 5000 | AI inference (chat, recommend, summarize, moderate) |
| `postgres` | Postgres 16 + pgvector | 5432 | Source-of-truth DB |
| `redis` | Redis 7 | 6379 | Cache, seat-lock, BullMQ, sessions |
| `minio` | MinIO | 9000/9001 | S3-compatible object storage |
| `mailhog` | MailHog | 8025 | Dev email |

### 5.3 Communication patterns

- **Sync REST**: browser ↔ web ↔ api. Schemas defined once in `packages/shared` with Zod, reused both sides.
- **Service-to-service**: api ↔ ai over HTTP with HMAC-SHA256 request signing. No direct exposure of `apps/ai` to the public internet in production.
- **Realtime**: Socket.IO with rooms keyed by `showtime:{id}`. Broadcasts: `seat.locked`, `seat.released`, `seat.sold`.
- **Async work**: BullMQ jobs on Redis. Queues: `email`, `embeddings`, `expire-bookings`, `summarize-reviews`.

### 5.4 Trust boundaries

- All admin routes pass through `RolesGuard('ADMIN' | 'STAFF')` and emit an `AuditLog` row.
- Service tokens between `api` and `ai` are short-lived (5 min) HS256 JWTs, signed with a shared secret rotated via env.
- VNPay webhooks verified by HMAC + `providerRef UNIQUE` for idempotency.
- No browser direct access to `apps/ai`; all chat traffic proxied through `apps/api/ai-proxy` with rate limiting (10 req/min per user).

## 6. Data Model

Postgres 16, Prisma ORM. 16 entities across 5 domains. See section 6.5 for ER summary.

### 6.1 Identity domain

- `User` — `id`, `email UNIQUE`, `passwordHash` (bcrypt 12), `role` enum `USER|ADMIN|STAFF`, `emailVerifiedAt`, `createdAt`.
- `Account` — OAuth providers (Google).
- `Session`, `RefreshToken` — Auth.js compliant.

### 6.2 Catalog domain

- `Movie` — `id`, `tmdbId UNIQUE`, `slug UNIQUE`, `title`, `originalTitle`, `overview`, `posterUrl`, `backdropUrl`, `runtimeMin`, `releaseDate`, `status` enum `NOW_SHOWING|COMING_SOON|ARCHIVED`, `ageRating`, `trailerYoutubeId`, `deletedAt` (soft delete).
- `Genre` — many-to-many with `Movie` via `MovieGenre`.
- `MovieEmbedding` — `movieId UNIQUE`, `embedding vector(768)`. HNSW index for cosine similarity.
- `Review` — `id`, `userId`, `movieId`, `rating 1-5`, `text`, `sentiment NUMERIC(3,2)`, `isModerated bool`, `moderationFlags JSON`.
- `ReviewSummary` — `movieId UNIQUE`, `bullets JSONB` (3 strings), `overallSentiment`, `generatedAt`.

### 6.3 Venue domain

- `Theater` — `id`, `slug UNIQUE`, `name`, `city`, `addressLine`, `lat`, `lng`, `deletedAt`.
- `ScreeningRoom` — `id`, `theaterId`, `name`, `layoutJson` (rows × cols metadata), `deletedAt`.
- `Seat` — `id`, `roomId`, `row`, `col`, `type` enum `STANDARD|VIP|COUPLE`, `isActive bool`, UNIQUE `(roomId, row, col)`.

### 6.4 Scheduling, booking, payment domain

- `Showtime` — `id`, `movieId`, `roomId`, `startAt`, `endAt`, `format` enum `D2|D3|IMAX`, `basePriceVND int`, `version int` (optimistic lock), UNIQUE `(roomId, startAt)`, INDEX `(movieId, startAt)`.
- `Booking` — `id`, `userId`, `showtimeId`, `status` enum `PENDING|CONFIRMED|CANCELLED|EXPIRED`, `totalAmountVND`, `paymentRef`, `qrToken`, `expiresAt`, `createdAt`, `confirmedAt`.
- `BookingSeat` — `bookingId`, `seatId`, `priceSnapshotVND`. **Partial unique index** `(showtimeId, seatId) WHERE status='CONFIRMED'` enforced via materialized constraint.
- `ConcessionItem` — `id`, `name`, `type`, `priceVND`, `imageUrl`, `isActive`.
- `BookingConcession` — `bookingId`, `itemId`, `qty`, `priceSnapshotVND`.
- `Voucher` — `id`, `code UNIQUE`, `discountType PERCENT|FIXED`, `discountValue`, `validFrom`, `validTo`, `maxUses`, `usedCount`, `scope ALL|MOVIE|THEATER`, `scopeRefId`.
- `BookingVoucher` — `bookingId`, `voucherId`, `discountAppliedVND`.
- `Payment` — `id`, `bookingId`, `provider VNPAY|STRIPE`, `providerRef UNIQUE`, `status PENDING|PAID|FAILED|REFUNDED`, `amountVND`, `paidAt`.

### 6.5 AI & audit domain

- `ChatSession` — `id`, `userId nullable` (anon allowed), `createdAt`, `lastMessageAt`.
- `ChatMessage` — `sessionId`, `role USER|ASSISTANT|SYSTEM`, `content`, `tokensIn`, `tokensOut`, `latencyMs`, `createdAt`.
- `AuditLog` — `id`, `actorId`, `action`, `targetType`, `targetId`, `diffJson`, `ip`, `userAgent`, `createdAt`. Append-only, partitioned monthly.

### 6.6 Critical decisions

1. **Seat-lock lives in Redis only** during PENDING; Postgres is the system-of-record only after `Payment.PAID`.
2. **Partial unique index** `BookingSeat (showtimeId, seatId) WHERE status='CONFIRMED'` is the final integrity gate. Even if Redis fails, double-booking is impossible at the DB level.
3. **Price snapshots** on `BookingSeat` and `BookingConcession` decouple historical orders from current pricing.
4. **Soft delete** on `Movie`, `Theater`, `ScreeningRoom` — admin "delete" sets `deletedAt`. Hard delete blocked by FK constraints.
5. **Optimistic lock** (`version int`) on `Showtime` to prevent concurrent admin edits.
6. **All money columns suffixed `VND`**, type `int` (no floats). Conversion to display happens at view layer.

## 7. Booking Flow & Concurrency

### 7.1 State machine

```
   IDLE  --POST /bookings/draft-->  DRAFT (5min Redis TTL)
                                       |
                                       | (user picks N seats — each Redis SETNX with TTL)
                                       v
                       POST /bookings/confirm
                                       |
                                       v
                                  PENDING (10min Redis TTL extended)
                                  /        \
                       VNPay OK  /          \  timeout / fail
                                v            v
                          CONFIRMED      EXPIRED/CANCELLED
                          (+QR token)
```

### 7.2 Happy path

```
1. User requests showtime page.
   - Next.js RSC: GET /api/showtimes/{id} (cache 30s, stale-while-revalidate)
   - Response merges: room layout + seat status from
     Postgres (CONFIRMED) + Redis (LOCKED).

2. Browser opens Socket.IO, joins "showtime:{id}".
   - Server emits "seat.snapshot" with current state.

3. User clicks seat A1.
   - Client emits "seat.lock_request" {seatId}.
   - Server: SET seat-lock:{showtimeId}:{seatId} {userId} NX EX 300
   - On success: broadcast "seat.locked" to room.
   - On failure: emit "seat.lock_denied" to caller only.

4. User completes selection.
   - POST /api/bookings/draft {showtimeId, seatIds[], combos[], voucherCode?}
   - Server transaction:
     a. Validate all seat-locks belong to this user (Redis MGET).
     b. Lock voucher row FOR UPDATE; reject if exhausted.
     c. Compute total (price × seat type × format multiplier + combos − voucher).
     d. INSERT Booking (PENDING, expiresAt = NOW + 10min).
     e. INSERT BookingSeat rows with priceSnapshot.
     f. Extend Redis seat-lock TTL to 600s.
     g. Return {bookingId, paymentUrl}.

5. Frontend redirects to VNPay sandbox.

6. VNPay POST /api/payments/vnpay/webhook (HMAC verified).
   - Server transaction:
     a. SELECT Payment WHERE providerRef = ? (idempotency check).
     b. SELECT Booking FOR UPDATE.
     c. UPDATE Payment.status = PAID.
     d. UPDATE Booking.status = CONFIRMED, confirmedAt = NOW.
     e. UPDATE BookingSeat.status = CONFIRMED.
     f. Voucher.usedCount++.
     g. Generate QR token (HS256 JWT, 4-hour TTL).
     h. Enqueue 'email:booking-confirmed' job.
     i. DEL Redis seat-lock keys.
     j. Emit "seat.sold" to Socket.IO room.

7. User redirected to /booking/{id}/success showing QR.
```

### 7.3 Failure modes

| Scenario | Mitigation |
|---|---|
| User abandons mid-flow | Redis TTL expires; cron job marks Booking EXPIRED, emits seat.released |
| VNPay webhook lost | Cron polls VNPay status every 2 min for PENDING > 5 min |
| Two users contest same seat | Redis SETNX is atomic; loser receives lock_denied + UI shake |
| Pod crashes mid-confirm | Webhook retried by VNPay; idempotency via providerRef UNIQUE |
| Voucher race (5 left, 10 buyers) | FOR UPDATE row lock + check usedCount < maxUses inside transaction |
| Admin cancels showtime | Soft cancel + BullMQ refund mock + email all affected users |
| Clock skew between pods | All TTLs use Redis server time; never app clock |

### 7.4 Engineering principles applied

- **Pessimistic Redis locking** for seat selection; **optimistic DB locking** for showtime metadata edits.
- **Confirm only on Payment.PAID**, never on user click; prevents fraud.
- **DB partial unique index** is the inviolable gate; Redis is fast, DB is correct.
- **Idempotency** on every external webhook (`providerRef UNIQUE`, retry-safe).
- **Saga pattern** with compensating actions for failed flows.

## 8. AI Pipeline

### 8.1 Provider abstraction

```python
class LLMProvider(ABC):
    @abstractmethod
    async def chat_stream(messages, **kwargs) -> AsyncIterator[str]: ...
    @abstractmethod
    async def embed(texts: list[str]) -> list[list[float]]: ...

class GeminiProvider(LLMProvider): ...    # default, free tier
class OllamaProvider(LLMProvider): ...    # local fallback
class FactoryProvider:
    @staticmethod
    def from_env() -> LLMProvider:
        return {"gemini": GeminiProvider, "ollama": OllamaProvider}[os.getenv("LLM_PROVIDER", "gemini")]()
```

This abstraction is itself a portfolio talking point: explicit Strategy + Factory patterns, swappable in one env var, both providers fully tested.

### 8.2 Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/ai/chat` | POST (SSE) | Streaming RAG chatbot |
| `/ai/recommend` | GET | Per-user homepage recommendations |
| `/ai/summarize-reviews` | POST | Cron-triggered review distillation |
| `/ai/moderate` | POST | Content moderation for user reviews |
| `/ai/embed` | POST | Internal: generate movie embeddings (called by job) |
| `/healthz`, `/readyz` | GET | Liveness, readiness |

### 8.3 RAG chat pipeline

```
user message
    |
    v
[validate + rate-limit]
    |
    v
[retrieve]
  - embed query (Gemini text-embedding-004, 768d)
  - pgvector cosine top-5 movies (filter status=NOW_SHOWING)
  - join showtimes in next 7 days
  - join user's last 3 bookings (if authed)
    |
    v
[build context]
  - system prompt (cinema assistant, in-domain only)
  - retrieved facts as structured JSON
  - last 6 turns of chat history
    |
    v
[LLM stream]
  - Gemini Flash (default) / Ollama (local)
  - SSE token stream → NestJS proxy → browser EventSource
    |
    v
[persist]
  - append ChatMessage (USER + ASSISTANT)
  - track tokensIn, tokensOut, latencyMs
```

System prompt enforces: only cinema/movie/booking topics, refuse off-topic with a polite redirect, never invent showtimes that aren't in the context.

### 8.4 Recommendation engine

- **Hybrid 70/30**: 70% content-based (cosine on `MovieEmbedding`), 30% collaborative-filtering (item-item from co-booking matrix recomputed nightly).
- **Cold start**: top-rated TMDb of the past 30 days.
- **Re-rank**: boost movies with showtimes in next 24h by 1.2×.
- Cached per user 1 hour in Redis.

### 8.5 Review summarization

- BullMQ job triggered when a movie reaches 10+ TMDb reviews or 7 days passed since last summary.
- Fetches top 20 reviews, sends to LLM with structured-output prompt: `{bullets: [3], overallSentiment: -1..1}`.
- Result cached in `ReviewSummary` table.

### 8.6 Moderation

- Optional passthrough on review submission. LLM returns `{verdict: ALLOW|FLAG|BLOCK, reasons[]}`. Flagged items go to admin queue.

## 9. Folder Structure

```
cinenova/
├── .github/workflows/
│   ├── ci.yml
│   ├── e2e.yml
│   └── docker-publish.yml
├── apps/
│   ├── web/                    # Next.js 15 App Router
│   ├── api/                    # NestJS 10
│   └── ai/                     # FastAPI
├── packages/
│   ├── db/                     # Prisma schema + migrations + seed
│   ├── shared/                 # Zod schemas + TypeScript types
│   ├── ui/                     # shadcn components + design tokens
│   └── config/                 # eslint, prettier, tsconfig, tailwind
├── docs/
│   ├── superpowers/specs/      # Design docs (this file)
│   ├── adr/                    # Architecture Decision Records
│   ├── api/                    # OpenAPI snapshot
│   └── runbook/                # Ops cheatsheet
├── infra/
│   ├── docker/                 # Per-service Dockerfiles
│   ├── docker-compose.yml      # Full local stack
│   └── docker-compose.prod.yml
├── scripts/                    # dev helpers
├── .env.example
├── .nvmrc
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
└── LICENSE
```

## 10. Testing Strategy

| Layer | Tool | Coverage target | Notes |
|---|---|---|---|
| Unit (Node) | Vitest | ≥80% on `bookings`, `payments`, `seats` | Fast feedback |
| Unit (Python) | pytest + pytest-asyncio | ≥80% on `pipelines/`, `providers/` | Mock LLM responses |
| Integration | Vitest + Testcontainers | All controllers | Real Postgres + Redis |
| E2E | Playwright | Golden path + admin smoke | Run on CI nightly |
| Concurrency | k6 | 100 users × 1 seat | CI nightly only |
| Type | tsc + mypy | 100% pass | Pre-push hook |

## 11. CI/CD

GitHub Actions workflows:

1. `ci.yml` — every PR: lint, typecheck, unit, integration (with services).
2. `e2e.yml` — main branch + nightly: Playwright headless.
3. `docker-publish.yml` — main + tags: build & push to GHCR.

Pre-commit (Husky + lint-staged): ESLint, Prettier, Commitlint. Pre-push: `tsc --noEmit`.

Live demo deployment:
- **web**: Vercel (free, GitHub auto-deploy on `main`).
- **api**: Render free tier (Docker).
- **ai**: Render free tier (Docker).
- **postgres**: Neon free.
- **redis**: Upstash free.
- **MinIO**: skipped in prod, use Cloudflare R2 free.

## 12. Roadmap

| Milestone | Commit prefix | Deliverable |
|---|---|---|
| M0 | `chore: init` | Monorepo, configs, README, CI skeleton |
| M1 | `feat(db)` | Prisma schema, migrations, seed (5 theaters, 30 movies, 200 showtimes) |
| M2 | `feat(api)` | Auth + movies + theaters + showtimes CRUD |
| M3 | `feat(api)` | Booking + seat-lock + VNPay sandbox + Socket.IO |
| M4 | `feat(web)` | Homepage + browse + detail + auth pages |
| M5 | `feat(web)` | Booking flow + seat picker realtime + checkout |
| M6 | `feat(admin)` | Admin dashboard CRUD |
| M7 | `feat(ai)` | FastAPI service + chatbot RAG + recommendation |
| M8 | `feat(web)` | Chat widget + recommendation section + review summary |
| M9 | `chore(infra)` | Docker Compose complete + production deploy |
| M10 | `test` | E2E + k6 + coverage badge + final docs |

## 13. Open Questions & Risks

| Item | Status | Plan |
|---|---|---|
| Free Gemini quota suffices for demo traffic | Likely | Add Redis cache (10 min) on `/ai/chat` per `(query+userId)` |
| Vercel cold start may slow first hit | Accept | Add `/healthz` ping cron from external service |
| TMDb rate limit (40 req / 10 sec) | Mitigate | Sync once daily into local DB; never hit TMDb at request time |
| pgvector performance at scale | Low risk | HNSW index; project will not exceed 10k movies |
| VNPay sandbox availability | Low risk | Stripe-test fallback adapter |

## 14. Decision Log (ADRs to write during build)

- ADR-0001: Why Turborepo over Nx
- ADR-0002: Redis seat-lock vs DB row-lock
- ADR-0003: pgvector vs Qdrant
- ADR-0004: NestJS modular monolith vs microservices split
- ADR-0005: LLM provider abstraction Strategy pattern
- ADR-0006: Auth.js v5 vs custom JWT layer
- ADR-0007: Conventional Commits + milestone-tagged history

## 15. Glossary

- **Booking**: one transaction by a user for one showtime; contains 1..N seats + 0..N concessions + 0..1 voucher.
- **Showtime**: a scheduled instance of a movie in a specific room at a specific time.
- **Seat-lock**: ephemeral hold on a seat in Redis during selection/payment.
- **Soft delete**: row remains in DB with `deletedAt` set; hidden from default queries.
- **Price snapshot**: amount frozen at booking time, used for accounting accuracy.

---

**End of design specification. Implementation plan: see `docs/superpowers/specs/2026-05-08-cinenova-implementation-plan.md`.**
