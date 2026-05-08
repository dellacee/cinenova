from fastapi import APIRouter, Query

from app.core.db import get_session
from app.pipelines.recommender import RecommendedMovie, recommend

router = APIRouter(tags=["recommend"])


@router.get("/recommend", response_model=list[RecommendedMovie])
async def get_recommendations(
    user_id: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=24),
) -> list[RecommendedMovie]:
    async with get_session() as session:
        return await recommend(session, user_id=user_id, limit=limit)
