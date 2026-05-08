"""Content moderation: classify a piece of user-generated text."""
from __future__ import annotations

import json
from typing import Literal, TypedDict

from app.providers.base import ChatMessage
from app.providers.factory import get_provider


class ModerationResult(TypedDict):
    verdict: Literal["ALLOW", "FLAG", "BLOCK"]
    reasons: list[str]


MODERATION_PROMPT = """\
You are CineNova's content moderator. Decide whether a user review is safe to
publish on a public movie page.

Output JSON only:

  {"verdict": "ALLOW" | "FLAG" | "BLOCK", "reasons": ["..."]}

Guidelines:
- ALLOW: respectful opinions, even strongly negative ones.
- FLAG: borderline (mild slurs, spoilers labelled or unlabelled, low-quality
  spam). Send for human review.
- BLOCK: hate speech, sexual harassment, doxxing, illegal content,
  explicit harm to a real person.
- Spoilers without warning → FLAG (not BLOCK).
"""


async def moderate(text: str) -> ModerationResult:
    provider = get_provider()
    messages: list[ChatMessage] = [
        {"role": "system", "content": MODERATION_PROMPT},
        {"role": "user", "content": text},
    ]
    chunks: list[str] = []
    async for c in provider.chat_stream(messages, temperature=0.0, max_tokens=200):
        chunks.append(c)
    raw = "".join(chunks).strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {"verdict": "FLAG", "reasons": ["moderation_parse_error"]}

    verdict = parsed.get("verdict", "FLAG")
    if verdict not in ("ALLOW", "FLAG", "BLOCK"):
        verdict = "FLAG"
    reasons = parsed.get("reasons", [])
    if not isinstance(reasons, list):
        reasons = [str(reasons)]
    return {"verdict": verdict, "reasons": [str(r) for r in reasons[:5]]}
