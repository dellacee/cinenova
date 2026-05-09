"""Review summarization pipeline."""
from __future__ import annotations

import json
from typing import TypedDict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.providers.base import ChatMessage
from app.providers.factory import get_provider


class ReviewSummary(TypedDict):
    bullets: list[str]
    overall_sentiment: float
    review_count: int


SUMMARY_PROMPT = """\
You will receive up to 20 user reviews of a movie. Output ONLY valid JSON of
the form:

  {"bullets": ["...", "...", "..."], "overall_sentiment": 0.42}

- "bullets": exactly 3 short Vietnamese-language insights (≤ 20 words each)
  capturing the audience consensus.
- "overall_sentiment": float in [-1, 1] where -1 = strongly negative,
  +1 = strongly positive, 0 = mixed.

No prose, no Markdown — JSON only.
"""


async def summarize_movie(session: AsyncSession, movie_id: str) -> ReviewSummary | None:
    sql = text("""
        SELECT text FROM reviews
        WHERE "movieId" = :mid AND text IS NOT NULL
        ORDER BY "createdAt" DESC
        LIMIT 20
    """)
    rows = (await session.execute(sql, {"mid": movie_id})).mappings().all()
    review_count = len(rows)
    if review_count == 0:
        return None

    joined = "\n\n---\n\n".join(str(r["text"]) for r in rows)
    messages: list[ChatMessage] = [
        {"role": "system", "content": SUMMARY_PROMPT},
        {"role": "user", "content": joined},
    ]

    provider = get_provider()
    chunks: list[str] = []
    async for c in provider.chat_stream(messages, temperature=0.2, max_tokens=400):
        chunks.append(c)
    raw = "".join(chunks).strip()

    # The model occasionally wraps JSON in fences — strip defensively.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None

    bullets = parsed.get("bullets", [])
    sentiment = float(parsed.get("overall_sentiment", 0))
    if not isinstance(bullets, list) or len(bullets) == 0:
        return None

    return {
        "bullets": [str(b)[:200] for b in bullets[:3]],
        "overall_sentiment": max(-1.0, min(1.0, sentiment)),
        "review_count": review_count,
    }
