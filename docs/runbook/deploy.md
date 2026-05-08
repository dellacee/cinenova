# Deployment runbook

CineNova uses three free-tier providers in production:

| Layer | Provider | Free tier? |
|---|---|---|
| Web (Next.js) | **Vercel** | Yes |
| API (NestJS) | **Render** (Docker web service) | Yes (sleeps after 15min idle) |
| AI (FastAPI) | **Render** (Docker web service) | Yes |
| Postgres | **Neon** | 0.5 GB free |
| Redis | **Upstash** | 10k commands/day free |
| Object storage | **Cloudflare R2** | 10 GB egress/month free |

Total monthly cost: **$0**.

## First-time deploy

### 1. Provision the database (Neon)

1. Sign up at https://neon.tech and create a project.
2. Enable the `vector` extension (`CREATE EXTENSION vector;`).
3. Copy the pooled + direct connection strings.

### 2. Provision Redis (Upstash)

1. Sign up at https://upstash.com.
2. Create a Redis database in the same region as Render.
3. Copy the `redis://` URL.

### 3. Deploy via render.yaml

```bash
# Install Render CLI (optional)
brew install render

# Or push render.yaml via the dashboard:
# Dashboard → New → Blueprint → Connect dellacee/cinenova
```

Set the secrets in the Render dashboard:

- `DATABASE_URL`, `DIRECT_URL` — from Neon
- `REDIS_URL` — from Upstash
- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey
- `SERVICE_TOKEN_SECRET` — same value across `cinenova-api` + `cinenova-ai`

### 4. Run migrations + seed against the live DB

From your laptop with `DATABASE_URL` exported:

```bash
DATABASE_URL='postgres://...' pnpm db:migrate:deploy
DATABASE_URL='postgres://...' pnpm db:seed
```

### 5. Deploy the web app (Vercel)

1. Visit https://vercel.com/new and import `dellacee/cinenova`.
2. Set the **Root Directory** to repo root (Vercel will use `vercel.json`).
3. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` — Render API URL
   - `NEXT_PUBLIC_WS_URL` — Render API URL with `wss://`
   - `AUTH_SECRET` — `openssl rand -hex 32`

### 6. Verify

```bash
curl https://cinenova-api.onrender.com/health/readiness
curl https://cinenova-ai.onrender.com/healthz
open https://cinenova.vercel.app
```

## Daily operations

- **Logs**: Render dashboard → service → Logs tab. JSON-structured by Pino.
- **Wake up**: Free Render services sleep after 15 minutes. Cron-ping `/health/liveness` from cron-job.org if you want them warm.
- **Migrations**: Always `pnpm db:migrate:deploy` (never `migrate dev` against production).
- **Rollback**: Render keeps the previous Docker image; redeploy from the dashboard.

## Local production mirror

To boot the same images locally:

```bash
COMPOSE_PROFILES=app pnpm docker:up
```

The `app` profile pulls in `web`, `api`, `ai` services on top of the always-on infra.
