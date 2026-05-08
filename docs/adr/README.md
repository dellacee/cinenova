# Architecture Decision Records

Each ADR captures a single non-obvious technical choice and the reasoning behind it. New ADRs go through `0001-...md`, `0002-...md`, etc.

| ID | Title | Status |
|---|---|---|
| [0001](./0001-turborepo-vs-nx.md) | Turborepo over Nx for monorepo orchestration | Accepted |
| [0002](./0002-redis-seat-lock.md) | Redis SETNX seat-lock over DB row-lock | Accepted |
| [0003](./0003-pgvector-vs-qdrant.md) | pgvector over Qdrant for vector search | Accepted |
| [0004](./0004-modular-monolith.md) | NestJS modular monolith over service-per-domain | Accepted |
| [0005](./0005-llm-provider-strategy.md) | LLM provider abstraction with the Strategy pattern | Accepted |
| [0006](./0006-authjs-v5.md) | Server-issued JWTs with optional Auth.js v5 client glue | Accepted |
| [0007](./0007-conventional-commits.md) | Conventional Commits + milestone-tagged history | Accepted |

Template: see [`template.md`](./template.md).
