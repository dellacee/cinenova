# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS base
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

# ----- deps -----
FROM base AS deps
COPY apps/ai/pyproject.toml ./
RUN uv pip install --system --no-cache .

# ----- runner -----
FROM deps AS runner
COPY apps/ai/app ./app
COPY apps/ai/README.md ./

RUN useradd --system --uid 1001 ai
USER ai

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:5000/healthz || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
