"""LLM provider contract — Strategy pattern.

Concrete implementations (gemini, ollama) live alongside this file.
The factory selects the provider at runtime based on `settings.LLM_PROVIDER`.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Literal, TypedDict


class ChatMessage(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


class LLMProvider(ABC):
    """Abstract interface every chat/embed provider must satisfy."""

    name: str

    @abstractmethod
    async def chat_stream(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Streaming completion. Yield raw text chunks (not SSE-encoded)."""
        ...
        # Pragma: this is an async generator method on the ABC.
        # The yield in the implementation is what makes it a generator.
        if False:  # pragma: no cover
            yield ""

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input. Dimension = settings.EMBEDDING_DIM."""
        ...


class ProviderError(Exception):
    """Raised when an underlying LLM call fails after retries."""
