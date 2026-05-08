# Local development runbook

## Prerequisites

- Node ≥ 20.10
- pnpm ≥ 9
- Python ≥ 3.12
- Docker Desktop (or compatible engine)
- Free API keys: [Gemini](https://aistudio.google.com/apikey), [TMDb](https://www.themoviedb.org/settings/api)

## First-time setup

```bash
git clone https://github.com/dellacee/cinenova.git
cd cinenova
cp .env.example .env
# edit .env, fill at minimum: GEMINI_API_KEY, TMDB_API_KEY

pnpm install
pnpm docker:up           # postgres, redis, minio, mailhog
pnpm db:migrate
pnpm db:seed
```

## Daily workflow

```bash
pnpm dev                 # all apps in parallel
pnpm test                # unit tests
pnpm lint                # eslint + ruff
pnpm typecheck           # tsc + mypy
```

To run only one app:

```bash
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter ai dev
```

## Resetting state

```bash
pnpm db:reset            # drop, migrate, seed
pnpm docker:down -v      # stop and remove volumes
```

## Common ports

| Service | Port |
|---|---|
| web | 3000 |
| api | 4000 |
| ai | 5000 |
| postgres | 5432 |
| redis | 6379 |
| minio API | 9000 |
| minio console | 9001 |
| mailhog SMTP | 1025 |
| mailhog UI | 8025 |
