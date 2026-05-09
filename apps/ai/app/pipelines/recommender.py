"""Hybrid recommender: 70% content-based (pgvector) + 30% co-booking signal."""
from __future__ import annotations

from typing import TypedDict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class RecommendedMovie(TypedDict):
    id: str
    slug: str
    title: str
    poster_url: str | None
    score: float


CONTENT_WEIGHT = 0.7
COLLAB_WEIGHT = 0.3
SHOWTIME_BOOST = 1.2


# Prisma maps table names to snake_case (via @@map) but leaves column names in
# camelCase. Postgres preserves quoted identifiers, so any non-lowercase column
# must be wrapped in double quotes.


async def recommend(
    session: AsyncSession,
    *,
    user_id: str | None,
    limit: int = 10,
) -> list[RecommendedMovie]:
    """Top-N personalized movie recommendations.

    - Cold start (no booking history): top-rated NOW_SHOWING by popularity.
    - Otherwise: blend cosine similarity to embeddings of movies the user
      booked + co-booking item-item similarity, then boost movies with
      showtimes in the next 24h.
    """
    if user_id:
        history_count = (
            await session.execute(
                text(
                    'SELECT COUNT(*) FROM bookings WHERE "userId" = :uid '
                    "AND status = 'CONFIRMED'"
                ),
                {"uid": user_id},
            )
        ).scalar_one()
        if history_count and int(history_count) > 0:
            return await _personalized(session, user_id, limit)
    return await _cold_start(session, limit)


async def _personalized(session: AsyncSession, user_id: str, limit: int) -> list[RecommendedMovie]:
    sql = text("""
        WITH user_movies AS (
            SELECT DISTINCT s."movieId" AS movie_id
            FROM bookings b
            JOIN showtimes s ON s.id = b."showtimeId"
            WHERE b."userId" = :uid AND b.status = 'CONFIRMED'
        ),
        user_centroid AS (
            SELECT AVG(me.embedding) AS vec
            FROM user_movies um
            JOIN movie_embeddings me ON me."movieId" = um.movie_id
        ),
        co_bookings AS (
            SELECT s2."movieId" AS rec_id, COUNT(*) AS co_count
            FROM bookings b1
            JOIN showtimes s1 ON s1.id = b1."showtimeId"
            JOIN bookings b2 ON b2."userId" != b1."userId" AND b2.status = 'CONFIRMED'
            JOIN showtimes s2 ON s2.id = b2."showtimeId"
            WHERE b1."userId" = :uid
              AND b1.status = 'CONFIRMED'
              AND s2."movieId" NOT IN (SELECT movie_id FROM user_movies)
            GROUP BY s2."movieId"
        ),
        scored AS (
            SELECT
                m.id, m.slug, m.title, m."posterUrl" AS poster_url,
                COALESCE(1 - (me.embedding <=> uc.vec), 0) AS sim,
                COALESCE(cb.co_count::float / NULLIF((SELECT MAX(co_count) FROM co_bookings), 0), 0) AS collab,
                EXISTS(
                    SELECT 1 FROM showtimes s
                    WHERE s."movieId" = m.id
                      AND s."isCancelled" = FALSE
                      AND s."startAt" BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
                ) AS has_soon
            FROM movies m
            LEFT JOIN movie_embeddings me ON me."movieId" = m.id
            LEFT JOIN co_bookings cb ON cb.rec_id = m.id
            CROSS JOIN user_centroid uc
            WHERE m."deletedAt" IS NULL
              AND m.status = 'NOW_SHOWING'
              AND m.id NOT IN (SELECT movie_id FROM user_movies)
        )
        SELECT
            id, slug, title, poster_url,
            (sim * :cw + collab * :collw) * (CASE WHEN has_soon THEN :boost ELSE 1.0 END) AS score
        FROM scored
        ORDER BY score DESC
        LIMIT :limit
    """)
    rows = (
        await session.execute(
            sql,
            {
                "uid": user_id,
                "cw": CONTENT_WEIGHT,
                "collw": COLLAB_WEIGHT,
                "boost": SHOWTIME_BOOST,
                "limit": limit,
            },
        )
    ).mappings().all()
    return _to_dto(rows)


async def _cold_start(session: AsyncSession, limit: int) -> list[RecommendedMovie]:
    sql = text("""
        SELECT id, slug, title, "posterUrl" AS poster_url,
               (COALESCE("voteAverage", 0) * 0.7 + COALESCE(popularity, 0) * 0.0005) AS score
        FROM movies
        WHERE "deletedAt" IS NULL AND status = 'NOW_SHOWING'
        ORDER BY score DESC
        LIMIT :limit
    """)
    rows = (await session.execute(sql, {"limit": limit})).mappings().all()
    return _to_dto(rows)


def _to_dto(rows: list[dict[str, object]]) -> list[RecommendedMovie]:
    return [
        RecommendedMovie(
            id=str(r["id"]),
            slug=str(r["slug"]),
            title=str(r["title"]),
            poster_url=(str(r["poster_url"]) if r["poster_url"] else None),
            score=float(r["score"]) if r["score"] is not None else 0.0,
        )
        for r in rows
    ]
