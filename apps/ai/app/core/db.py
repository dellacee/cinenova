"""Async SQLAlchemy engine pointing at the shared CineNova Postgres.

The AI service operates in read-only mode: it never writes booking-related state.
The only tables it mutates are `movie_embeddings`, `review_summaries`, and
`chat_messages` — all of which are AI-owned.
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


async def init_db() -> None:
    global _engine, _session_maker
    _engine = create_async_engine(
        settings.asyncpg_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )
    _session_maker = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)


async def close_db() -> None:
    if _engine is not None:
        await _engine.dispose()


def get_session() -> AsyncSession:
    if _session_maker is None:
        raise RuntimeError("DB not initialized — call init_db() first")
    return _session_maker()
