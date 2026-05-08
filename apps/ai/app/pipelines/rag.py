"""RAG retrieval + prompt construction for the chatbot."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TypedDict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.providers.base import ChatMessage
from app.providers.factory import get_provider


class RetrievedMovie(TypedDict):
    id: str
    title: str
    overview: str
    age_rating: str
    runtime_min: int
    next_showtime: str | None
    cinema_name: str | None
    similarity: float


SYSTEM_PROMPT = """\
You are CineNova's in-app movie assistant. You help users discover movies and
plan their cinema visits.

Hard rules:
- Answer ONLY about movies, showtimes, theaters, or booking flow related to
  CineNova. If asked anything off-topic, politely redirect.
- NEVER invent movies, showtimes, prices, or theater information not present in
  the retrieved context. If the user asks about something the context doesn't
  cover, say so honestly.
- Reply in the user's language (Vietnamese or English). Default to Vietnamese
  unless the user clearly writes in English.
- Be concise: short paragraphs, bullet lists when comparing.
- When a user is ready to book, suggest they tap the showtime in the movie
  detail page. Do NOT ask for credit-card details — never.
"""


async def retrieve(
    session: AsyncSession,
    query: str,
    *,
    user_id: str | None = None,
    limit: int = 5,
) -> list[RetrievedMovie]:
    """Embed the query, run pgvector cosine search, enrich with showtimes."""
    provider = get_provider()
    embeddings = await provider.embed([query])
    if not embeddings:
        return []
    qvec = embeddings[0]

    # pgvector cosine distance — convert vector to literal cast for asyncpg.
    vec_literal = "[" + ",".join(f"{x:.6f}" for x in qvec) + "]"

    sql = text(f"""
        WITH closest AS (
            SELECT
                m.id, m.title, m.overview, m.age_rating, m.runtime_min,
                1 - (me.embedding <=> '{vec_literal}'::vector) AS similarity
            FROM movies m
            JOIN movie_embeddings me ON me.movie_id = m.id
            WHERE m.deleted_at IS NULL AND m.status = 'NOW_SHOWING'
            ORDER BY me.embedding <=> '{vec_literal}'::vector
            LIMIT :limit
        )
        SELECT
            c.id, c.title, c.overview, c.age_rating, c.runtime_min, c.similarity,
            (
                SELECT s.start_at::text
                FROM showtimes s
                WHERE s.movie_id = c.id
                  AND s.is_cancelled = FALSE
                  AND s.start_at > NOW()
                ORDER BY s.start_at ASC
                LIMIT 1
            ) AS next_showtime,
            (
                SELECT t.name
                FROM showtimes s
                JOIN screening_rooms r ON r.id = s.room_id
                JOIN theaters t ON t.id = r.theater_id
                WHERE s.movie_id = c.id
                  AND s.is_cancelled = FALSE
                  AND s.start_at > NOW()
                ORDER BY s.start_at ASC
                LIMIT 1
            ) AS cinema_name
        FROM closest c
    """)
    rows = (await session.execute(sql, {"limit": limit})).mappings().all()
    return [
        RetrievedMovie(
            id=str(row["id"]),
            title=str(row["title"]),
            overview=str(row["overview"]),
            age_rating=str(row["age_rating"]),
            runtime_min=int(row["runtime_min"]),
            next_showtime=str(row["next_showtime"]) if row["next_showtime"] else None,
            cinema_name=str(row["cinema_name"]) if row["cinema_name"] else None,
            similarity=float(row["similarity"]),
        )
        for row in rows
    ]


def build_messages(
    query: str,
    history: list[ChatMessage],
    retrieved: list[RetrievedMovie],
) -> list[ChatMessage]:
    """Assemble the final chat-completion message list."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if retrieved:
        context_lines: list[str] = [f"Today is {today}. Top relevant movies right now:"]
        for i, m in enumerate(retrieved, 1):
            line = (
                f"{i}. {m['title']} ({m['age_rating']}, {m['runtime_min']}min). "
                f"Synopsis: {m['overview'][:200]}…"
            )
            if m["next_showtime"]:
                line += f" Next showtime: {m['next_showtime']} at {m['cinema_name'] or 'a CineNova theater'}."
            context_lines.append(line)
        context = "\n".join(context_lines)
    else:
        context = (
            f"Today is {today}. No relevant movie context found for the user's question. "
            "If they ask about specific movies, say you don't have that information."
        )

    messages: list[ChatMessage] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": context},
    ]
    # Last 6 turns of history for continuity.
    messages.extend(history[-6:])
    messages.append({"role": "user", "content": query})
    return messages
