-- Enforce: a seat at a given showtime can only belong to one CONFIRMED booking.
-- Postgres-only partial unique index. Prisma generates regular @@unique([bookingId, seatId])
-- in schema.prisma; this raw migration adds the cross-row business invariant.

CREATE UNIQUE INDEX IF NOT EXISTS booking_seats_confirmed_unique
  ON booking_seats (showtime_id, seat_id)
  WHERE booking_id IN (SELECT id FROM bookings WHERE status = 'CONFIRMED');

-- HNSW index on movie_embeddings for cosine similarity, used by the AI service.
-- Created with conservative defaults; tune m/ef_construction once we have >5k rows.
CREATE INDEX IF NOT EXISTS movie_embeddings_hnsw
  ON movie_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
