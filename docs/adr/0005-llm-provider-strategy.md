# ADR-0005 — LLM provider abstraction with the Strategy pattern

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-08 |
| **Decision-makers** | dellacee |

## Context

CineNova's AI features need to switch between Gemini (cloud, free tier) for the
hosted demo and Ollama (local) for offline contributors. We also want to keep
the option open for OpenAI / Anthropic later without rewriting pipelines.

## Decision

Define a thin `LLMProvider` abstract base class with two methods —
`chat_stream(messages, ...)` and `embed(texts)` — and select the concrete
class at runtime from `LLM_PROVIDER`. Pipelines call `get_provider()`; they
never know which backend is active.

The factory falls back to Ollama in development if `GEMINI_API_KEY` is missing,
so contributors can boot the AI service without configuring a key.

## Alternatives considered

- **LangChain / LlamaIndex** — Heavy, opinionated, brings in a long
  dependency tree. We have one retrieval pattern (pgvector cosine) and one
  prompt template; we don't need a framework.
- **OpenAI-compatible client (Ollama-OpenAI compat layer)** — Less explicit;
  hides the difference between providers behind a leaky abstraction. Strategy
  pattern keeps each provider's quirks (Gemini system_instruction vs Ollama
  message list) honestly contained.

## Consequences

- The abstraction is **two methods**, not a framework. Easy to read.
- Adding a new provider = a new file + an entry in the factory dict.
- Each pipeline (RAG, recommender, summarizer, moderator) is provider-agnostic
  by construction.
- The system prompt + retrieval grounding is identical regardless of provider,
  so behavior stays consistent in the hosted demo and on a contributor's
  laptop.
