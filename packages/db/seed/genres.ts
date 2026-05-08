import type { PrismaClient } from '../src/index.js';

/**
 * TMDb canonical genre IDs (stable across the API).
 * Mirrored locally so we can survive TMDb outages and avoid round-trips.
 */
const GENRES: Array<{ id: number; name: string; slug: string }> = [
  { id: 28, name: 'Action', slug: 'action' },
  { id: 12, name: 'Adventure', slug: 'adventure' },
  { id: 16, name: 'Animation', slug: 'animation' },
  { id: 35, name: 'Comedy', slug: 'comedy' },
  { id: 80, name: 'Crime', slug: 'crime' },
  { id: 99, name: 'Documentary', slug: 'documentary' },
  { id: 18, name: 'Drama', slug: 'drama' },
  { id: 10751, name: 'Family', slug: 'family' },
  { id: 14, name: 'Fantasy', slug: 'fantasy' },
  { id: 36, name: 'History', slug: 'history' },
  { id: 27, name: 'Horror', slug: 'horror' },
  { id: 10402, name: 'Music', slug: 'music' },
  { id: 9648, name: 'Mystery', slug: 'mystery' },
  { id: 10749, name: 'Romance', slug: 'romance' },
  { id: 878, name: 'Science Fiction', slug: 'science-fiction' },
  { id: 53, name: 'Thriller', slug: 'thriller' },
  { id: 10752, name: 'War', slug: 'war' },
  { id: 37, name: 'Western', slug: 'western' },
];

export async function seedGenres(prisma: PrismaClient) {
  for (const g of GENRES) {
    await prisma.genre.upsert({
      where: { id: g.id },
      update: { name: g.name, slug: g.slug },
      create: g,
    });
  }
  console.info(`  • genres: ${GENRES.length}`);
}
