"""Provider factory + module-level singleton."""
from __future__ import annotations

from app.core.config import settings
from app.providers.base import LLMProvider, ProviderError
from app.providers.gemini import GeminiProvider
from app.providers.ollama import OllamaProvider


def make_provider() -> LLMProvider:
    """Resolve the active LLM provider from environment.

    Falls back to Ollama if Gemini key is missing in dev — keeps the service
    bootable for contributors who haven't configured a key yet.
    """
    if settings.LLM_PROVIDER == "gemini":
        if not settings.GEMINI_API_KEY:
            if settings.NODE_ENV == "development":
                return OllamaProvider()
            raise ProviderError("GEMINI_API_KEY missing in non-development env")
        return GeminiProvider()
    if settings.LLM_PROVIDER == "ollama":
        return OllamaProvider()
    raise ProviderError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")


_provider: LLMProvider | None = None


def get_provider() -> LLMProvider:
    global _provider
    if _provider is None:
        _provider = make_provider()
    return _provider
