from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
async def readiness() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "provider": settings.LLM_PROVIDER,
    }
