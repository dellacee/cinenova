"""Smoke tests for the provider factory.

Real LLM calls are out of scope here; we just assert that the factory wires up
the right class for each LLM_PROVIDER setting.
"""
from __future__ import annotations

import os
from unittest.mock import patch

import pytest

# Ensure required env vars exist before importing settings.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("SERVICE_TOKEN_SECRET", "x" * 32)


@pytest.mark.parametrize("provider_name", ["gemini", "ollama"])
def test_factory_returns_provider(provider_name: str) -> None:
    with patch.dict(
        os.environ,
        {"LLM_PROVIDER": provider_name, "GEMINI_API_KEY": "test-key"},
    ):
        # Re-import settings + factory to pick up env changes.
        from importlib import reload

        from app.core import config as cfg

        reload(cfg)
        from app.providers import factory as fac

        reload(fac)
        provider = fac.make_provider()
        assert provider.name == provider_name


def test_factory_falls_back_to_ollama_in_dev_without_key() -> None:
    with patch.dict(
        os.environ,
        {
            "LLM_PROVIDER": "gemini",
            "GEMINI_API_KEY": "",
            "NODE_ENV": "development",
        },
        clear=False,
    ):
        from importlib import reload

        from app.core import config as cfg

        reload(cfg)
        from app.providers import factory as fac

        reload(fac)
        provider = fac.make_provider()
        assert provider.name == "ollama"
