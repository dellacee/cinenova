-- Bootstrap extensions for the CineNova Postgres instance.
-- Run automatically by the official pgvector/pgvector:pg16 image on first boot.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
