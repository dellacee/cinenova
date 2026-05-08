"""FastAPI bootstrap for CineNova AI service."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import close_db, init_db
from app.core.redis import close_redis, init_redis
from app.routers import chat, health, moderate, recommend, summarize

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize and tear down shared resources around the request loop."""
    await init_db()
    await init_redis()
    log.info("ai.startup", env=settings.NODE_ENV, llm_provider=settings.LLM_PROVIDER)
    yield
    await close_redis()
    await close_db()
    log.info("ai.shutdown")


app = FastAPI(
    title="CineNova AI",
    description=(
        "AI service: grounded chatbot (RAG over the live catalog), hybrid "
        "recommendation, review summarization, content moderation."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router, prefix="/ai")
app.include_router(recommend.router, prefix="/ai")
app.include_router(summarize.router, prefix="/ai")
app.include_router(moderate.router, prefix="/ai")
