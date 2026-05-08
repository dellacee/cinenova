"""Local Ollama provider — fallback when LLM_PROVIDER=ollama."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings
from app.providers.base import ChatMessage, LLMProvider, ProviderError


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self) -> None:
        self._base = settings.OLLAMA_BASE_URL.rstrip("/")
        self._model = settings.OLLAMA_MODEL
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=5.0))

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        body = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                **({"num_predict": max_tokens} if max_tokens else {}),
            },
        }
        async with self._client.stream("POST", f"{self._base}/api/chat", json=body) as resp:
            if resp.status_code >= 400:
                raise ProviderError(f"Ollama error {resp.status_code}: {await resp.aread()!r}")
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if payload.get("done"):
                    break
                msg = payload.get("message", {})
                content = msg.get("content")
                if content:
                    yield content

    async def embed(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for text in texts:
            resp = await self._client.post(
                f"{self._base}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text},
            )
            if resp.status_code >= 400:
                raise ProviderError(f"Ollama embed error {resp.status_code}")
            data = resp.json()
            embedding = data.get("embedding")
            if not embedding:
                raise ProviderError("Ollama returned no embedding")
            out.append(embedding)
        return out
