# ADR-0002 — Redis SETNX seat-lock over DB row-lock

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-08 |
| **Decision-makers** | dellacee |

## Context

The seat selection step needs sub-second feedback to a user choosing a seat — and to other users in the same showtime watching seats become unavailable. The lock must:

- Be atomic across multiple API instances.
- Auto-release if the user disappears.
- Be cheap to query and broadcast.

## Decision

Use **Redis `SET NX EX`** scoped to `seat-lock:{showtimeId}:{seatId} → userId` with a 5-minute TTL during selection, extended to 10 minutes once the user submits a booking draft (covers the payment window).

The Postgres `bookings + booking_seats` tables are the system-of-record for *confirmed* purchases. A partial unique index on `(showtimeId, seatId) WHERE booking is CONFIRMED` is the inviolable backstop.

## Alternatives considered

- **Postgres `SELECT FOR UPDATE`** — would require an open transaction during seat selection (5+ minutes). Holds a connection from the pool, blocks concurrent reads on the row, and is fragile to network blips. Disqualified.
- **Postgres advisory locks** — atomic but session-scoped; doesn't survive disconnects gracefully and has no TTL.
- **Optimistic-locking only** — too late for UX; the second user wouldn't know the seat is taken until checkout.

## Consequences

- One additional dependency (Redis), which we already need for cache + queues anyway.
- Two-tier invariant: Redis for liveness, Postgres for correctness. Code must respect that ordering — confirm only on payment success, never on user click.
- Disaster recovery: if Redis is wiped, all in-flight selections are lost. That's acceptable; the worst case is a user re-picking seats.
- Lua scripts (release, extend) used to make compound checks atomic.
