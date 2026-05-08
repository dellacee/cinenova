# ADR-0006 — Server-issued JWTs with optional Auth.js v5 client glue

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-08 |
| **Decision-makers** | dellacee |

## Context

The web app needs login flows (email/password, Google OAuth) and the API
needs to authenticate every request. Two reasonable patterns exist:

- **Auth.js v5 (NextAuth) owns auth end-to-end** — sessions live in cookies
  managed by the Next.js server, Prisma adapter writes to Postgres.
- **Server-issued JWTs from NestJS** — the API mints access + refresh
  tokens, the web app stores them and sends `Authorization: Bearer ...`.

## Decision

NestJS owns auth. The API exposes `/auth/signup`, `/auth/login`,
`/auth/refresh`, `/auth/logout`, `/auth/me`. Web app calls these directly
and persists the tokens via Zustand. Auth.js is reserved for OAuth provider
glue if we add a Google sign-in button on the web side.

## Alternatives considered

- **Auth.js v5 only** — Next.js becomes the auth boundary. Problems: the AI
  service and any future mobile client need a separate auth path; the API
  layer is the natural place for RBAC, rate limiting, and audit logs;
  forcing the API to validate Auth.js cookies couples it to a Next-specific
  format.
- **Auth0 / Clerk / Supabase Auth** — Excellent products, but a paid
  dependency and a vendor lock-in for a portfolio project. The implementation
  burden of email/password + OAuth in NestJS is small (under 200 lines).

## Consequences

- One mental model: the API is the auth boundary. Every consumer (web,
  mobile, third-party integrations later) goes through the same flow.
- Refresh-token rotation lives in Postgres (`refresh_tokens` table with
  `revokedAt`); on every refresh, the old token is marked revoked and a new
  pair is issued. Detects token theft.
- Web stores tokens in Zustand (`localStorage`). Acceptable for a
  portfolio: the alternative — httpOnly cookies — requires CSRF tokens and
  same-domain hosting, which complicates the Vercel + Render split.
- Trade-off: a leaked access token is usable for 15 minutes. Refresh tokens
  rotate so their leak is bounded too.
