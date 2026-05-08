from fastapi import APIRouter, HTTPException

from app.core.db import get_session
from app.pipelines.summarizer import ReviewSummary, summarize_movie

router = APIRouter(tags=["summarize"])


@router.post("/summarize-reviews/{movie_id}", response_model=ReviewSummary)
async def summarize_reviews(movie_id: str) -> ReviewSummary:
    async with get_session() as session:
        result = await summarize_movie(session, movie_id)
    if result is None:
        raise HTTPException(status_code=404, detail="not_enough_reviews")
    return result
