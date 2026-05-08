"""Application settings, validated via pydantic-settings."""
from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single source of truth for runtime config. Validates env at startup."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    NODE_ENV: Literal["development", "test", "production"] = "development"

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"

    SERVICE_TOKEN_SECRET: str
    NEXT_PUBLIC_APP_URL: str = "http://localhost:3000"

    LLM_PROVIDER: Literal["gemini", "ollama"] = "gemini"
    GEMINI_API_KEY: str | None = None
    GEMINI_CHAT_MODEL: str = "gemini-2.0-flash-exp"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIM: int = 768

    RATE_LIMIT_AI_PER_MIN: int = 10

    LOG_LEVEL: str = "info"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.NEXT_PUBLIC_APP_URL.split(",") if o.strip()]

    @property
    def asyncpg_url(self) -> str:
        """Convert standard postgresql:// URL to async driver."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url


settings: Settings = Settings()  # pyright: ignore[reportCallIssue]
