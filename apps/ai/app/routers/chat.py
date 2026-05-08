"""Streaming RAG chatbot endpoint."""
from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.core.db import get_session
from app.pipelines.rag import build_messages, retrieve
from app.providers.base import ChatMessage
from app.providers.factory import get_provider

router = APIRouter(tags=["chat"])


class ChatHistoryItem(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    user_id: str | None = None
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=20)


@router.post("/chat")
async def chat(req: ChatRequest) -> EventSourceResponse:
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="empty_query")

    async def generator() -> AsyncIterator[dict[str, str]]:
        async with get_session() as session:
            retrieved = await retrieve(session, req.query, user_id=req.user_id, limit=5)

        history: list[ChatMessage] = [
            {"role": "user" if h.role == "user" else "assistant", "content": h.content}
            for h in req.history
        ]
        messages = build_messages(req.query, history, retrieved)

        provider = get_provider()
        try:
            async for chunk in provider.chat_stream(messages, temperature=0.4, max_tokens=800):
                yield {"event": "chunk", "data": chunk}
        except Exception as exc:  # noqa: BLE001
            yield {"event": "error", "data": str(exc)}
        else:
            yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(generator())
