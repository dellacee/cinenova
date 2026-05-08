/**
 * Seed orchestrator. Runs idempotently: each step uses upsert semantics
 * keyed by stable natural keys (slug, code, tmdbId).
 *
 * Order matters: identity → catalog → venue → scheduling → commerce.
 */
import { prisma } from '../src/index.js';

import { seedConcessions } from './concessions.js';
import { seedGenres } from './genres.js';
import { seedMovies } from './movies.js';
import { seedShowtimes } from './showtimes.js';
import { seedTheaters } from './theaters.js';
import { seedUsers } from './users.js';
import { seedVouchers } from './vouchers.js';

async function main() {
  console.info('🌱  CineNova seed starting...');
  const t0 = Date.now();

  await seedUsers(prisma);
  await seedGenres(prisma);
  await seedMovies(prisma);
  await seedTheaters(prisma);
  await seedShowtimes(prisma);
  await seedConcessions(prisma);
  await seedVouchers(prisma);

  console.info(`✅  Seed complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
