# CineNova AI Service

FastAPI microservice that powers the chatbot, recommendations, review
summaries, and content moderation. Reads the shared Postgres + pgvector
database in read-only mode (except for `chat_messages`, `movie_embeddings`,
`review_summaries`).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/ai/chat` | Streaming RAG chatbot (SSE) |
| `GET`  | `/ai/recommend` | Personalized recommendations |
| `POST` | `/ai/summarize-reviews/{movie_id}` | Generate review distillation |
| `POST` | `/ai/moderate` | Classify user-generated content |
| `GET`  | `/healthz` `/readyz` | Probes |

## Run locally

```bash
cd apps/ai
uv sync
uv run uvicorn app.main:app --reload --port 5000
```

API docs at http://localhost:5000/docs.

## Switch providers

```bash
# Default — Gemini Flash (free tier)
LLM_PROVIDER=gemini GEMINI_API_KEY=... uv run ...

# Local Ollama
LLM_PROVIDER=ollama OLLAMA_BASE_URL=http://localhost:11434 uv run ...
```

See `docs/adr/0005-llm-provider-strategy.md` for the rationale.
