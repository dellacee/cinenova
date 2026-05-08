# ADR-0004 — NestJS modular monolith over service-per-domain

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-08 |
| **Decision-makers** | dellacee |

## Context

CineNova has clear domain boundaries (catalog, scheduling, booking, payments,
AI). The textbook microservices reflex would be one service per boundary.
We are a small team (one engineer) shipping a portfolio project on free-tier
infrastructure.

## Decision

Single NestJS application, one module per bounded context. The Python AI
service is the only out-of-process split.

## Alternatives considered

- **Microservice per domain** — Six API services (catalog, scheduling,
  booking, payment, vouchers, audit) plus the AI service. Each would need its
  own deployment unit, observability, network policy, distributed tracing,
  and inter-service contracts. Operational overhead dominates engineering
  time at this scale.
- **Two-service split (catalog read API + transactional API)** — Better than
  full microservices but still doubles deployment surface for marginal
  benefit; module boundaries inside one app already give us the same
  isolation at the code level.

## Decision drivers

- One engineer, free-tier hosting → operational simplicity wins.
- Module boundaries enforced at the code level: each module exports
  exactly what it wants visible. No module reaches into another module's
  Prisma queries.
- The single split that earns its complexity is **AI**: it runs Python,
  needs different scaling characteristics, and isolating LLM failures from
  the booking transaction path is genuinely useful.

## Consequences

- Faster iteration: one repo, one Docker image to ship, one log stream.
- The booking flow is a single in-process transaction — no saga across
  services, no two-phase commit, no message broker.
- Trade-off: when the team grows we will need to peel off services. The
  module-per-domain layout makes that future split inexpensive: each module
  is already a candidate microservice.
