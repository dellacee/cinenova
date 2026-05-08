"""Smoke tests for AI pipeline data shapes.

We don't hit a live LLM here. These tests just guard the public contracts
of the pipeline TypedDicts so a future refactor can't silently break the
API contract that the web app depends on.
"""
from __future__ import annotations

import os

# Ensure required env vars exist before importing settings-dependent modules.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("SERVICE_TOKEN_SECRET", "x" * 32)
os.environ.setdefault("GEMINI_API_KEY", "test-key")


def test_recommended_movie_shape() -> None:
    from app.pipelines.recommender import RecommendedMovie

    sample: RecommendedMovie = {
        "id": "abc",
        "slug": "abc-1",
        "title": "Sample",
        "poster_url": None,
        "score": 0.42,
    }
    assert sample["id"] == "abc"
    assert isinstance(sample["score"], float)


def test_review_summary_shape() -> None:
    from app.pipelines.summarizer import ReviewSummary

    sample: ReviewSummary = {
        "bullets": ["a", "b", "c"],
        "overall_sentiment": 0.5,
        "review_count": 12,
    }
    assert len(sample["bullets"]) == 3
    assert -1.0 <= sample["overall_sentiment"] <= 1.0


def test_moderation_verdict_values() -> None:
    from typing import get_args

    from app.pipelines.moderator import ModerationResult

    # Verify the Literal type still has all three verdicts.
    annotations = ModerationResult.__annotations__
    assert "verdict" in annotations
    verdict_args = get_args(annotations["verdict"])
    assert set(verdict_args) == {"ALLOW", "FLAG", "BLOCK"}
