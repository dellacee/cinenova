# Troubleshooting

## `pnpm install` is slow on Windows

Enable [long paths](https://learn.microsoft.com/windows/win32/fileio/maximum-file-path-limitation) and exclude the repo from Windows Defender scanning.

## Postgres connection refused after reboot

Docker Desktop sometimes stops the container. Run `pnpm docker:up`.

## `pgvector` extension missing

Use the pinned image `pgvector/pgvector:pg16` (already configured in `infra/docker-compose.yml`). Custom Postgres installs may not include the extension.

## Auth.js `AUTH_SECRET` error

Generate a secret:

```bash
openssl rand -hex 32
```

Paste into `.env` as `AUTH_SECRET=...`.

## Gemini quota exceeded

Switch to local Ollama: set `LLM_PROVIDER=ollama` and run `ollama pull llama3.1:8b`.

## Husky hooks not firing

```bash
pnpm exec husky
chmod +x .husky/pre-commit .husky/commit-msg
```
