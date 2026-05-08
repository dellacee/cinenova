from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.pipelines.moderator import ModerationResult, moderate

router = APIRouter(tags=["moderate"])


class ModerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@router.post("/moderate", response_model=ModerationResult)
async def post_moderate(req: ModerateRequest) -> ModerationResult:
    return await moderate(req.text)
