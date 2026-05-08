"""Google Gemini provider — default in CineNova thanks to its free tier."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.providers.base import ChatMessage, LLMProvider, ProviderError


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ProviderError("GEMINI_API_KEY is not configured")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._model = genai.GenerativeModel(settings.GEMINI_CHAT_MODEL)

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        # Gemini SDK expects a list of {"role": "user"|"model", "parts": [...]}.
        # System messages are merged into the first user message via system_instruction.
        system_text = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        history = [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [m["content"]]}
            for m in messages
            if m["role"] != "system"
        ]

        model = (
            genai.GenerativeModel(settings.GEMINI_CHAT_MODEL, system_instruction=system_text)
            if system_text
            else self._model
        )

        gen_config: dict[str, float | int] = {"temperature": temperature}
        if max_tokens:
            gen_config["max_output_tokens"] = max_tokens

        # The Gemini SDK is sync; offload its blocking generator to a thread.
        loop = asyncio.get_running_loop()
        stream = await loop.run_in_executor(
            None,
            lambda: model.generate_content(history, generation_config=gen_config, stream=True),
        )

        for chunk in stream:
            try:
                if chunk.text:
                    yield chunk.text
            except Exception:  # noqa: BLE001
                continue

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: genai.embed_content(
                model=f"models/{settings.EMBEDDING_MODEL}",
                content=texts,
                task_type="retrieval_document",
            ),
        )
        embeddings = result.get("embedding")
        if embeddings is None:
            raise ProviderError("Gemini returned no embeddings")
        # Some versions return list[list[float]] when content is a list,
        # others return list[float] when it's a single string. Normalize.
        if embeddings and isinstance(embeddings[0], (int, float)):
            return [embeddings]  # type: ignore[list-item]
        return embeddings  # type: ignore[return-value]
