# ADR-0003 — pgvector over Qdrant for vector search

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-08 |
| **Decision-makers** | dellacee |

## Context

CineNova's AI features (chat retrieval, "for you" recommendations) require k-NN search on movie embeddings (768-dim). At our target scale — under 10,000 movies, under 100k embeddings total — we have two reasonable choices:

- **pgvector** — Postgres extension; embeddings live next to relational data.
- **Qdrant** — dedicated vector database; richer query API, hybrid filtering.

## Decision

Use **pgvector** with an HNSW index on `movie_embeddings.embedding`.

## Alternatives considered

- **Qdrant** — Excellent product, but a separate service to run, deploy, monitor. Adds a network hop and a synchronization problem (when a movie row updates, we have to fan-out to Qdrant). The query advantages don't matter at our scale.
- **Pinecone / Weaviate cloud** — Not zero-cost. Disqualified for a free-tier portfolio project.

## Consequences

- One fewer service in `docker-compose`.
- Joins between vector search results and relational metadata are local SQL joins, not cross-service plumbing.
- Migrations and backups follow the same Postgres conventions everywhere else.
- If we ever cross 1M vectors, we can swap Qdrant in behind the same `Retriever` interface in `apps/ai`. Strategy pattern at the pipeline level keeps this reversible.
