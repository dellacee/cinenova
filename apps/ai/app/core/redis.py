"""Async Redis client used for response caching."""
from __future__ import annotations

import redis.asyncio as redis

from app.core.config import settings

_client: redis.Redis | None = None


async def init_redis() -> None:
    global _client
    _client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    await _client.ping()


async def close_redis() -> None:
    if _client is not None:
        await _client.close()


def get_redis() -> redis.Redis:
    if _client is None:
        raise RuntimeError("Redis not initialized")
    return _client
