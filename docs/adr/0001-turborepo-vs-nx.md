# ADR-0001 — Turborepo over Nx for monorepo orchestration

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-08 |
| **Decision-makers** | dellacee |

## Context

CineNova spans Next.js, NestJS, FastAPI, and several shared TypeScript packages. We need a monorepo orchestrator that handles task graphs, remote caching, and cross-package builds without imposing a heavy plugin model.

## Decision

Use **Turborepo** with **pnpm workspaces**.

## Alternatives considered

- **Nx** — More features (project graph, generators, computation cache) but a steeper plugin model; heavier configuration overhead and conventions that conflict with stock Next.js / NestJS scaffolds.
- **Plain pnpm workspaces** — Simplest, but lacks task graph caching, harder to wire CI parallelism efficiently.

## Consequences

- Faster onboarding for contributors familiar with stock TypeScript tooling.
- Native Vercel remote-cache support; works well with our deploy target.
- Trade-off: no first-party generator system; we will scaffold by hand or with `nest`/`next` CLIs and that is acceptable at this size.
