import type { PrismaClient } from '../src/index.js';

import { fetchPopularMovies } from './tmdb.js';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function seedMovies(prisma: PrismaClient) {
  const movies = await fetchPopularMovies(30);
  let now = 0;
  let upcoming = 0;

  const today = new Date();
  for (const [i, m] of movies.entries()) {
    // Half are NOW_SHOWING (past releases), half COMING_SOON (future).
    const isUpcoming = i % 2 === 1;
    const status = isUpcoming ? 'COMING_SOON' : 'NOW_SHOWING';
    const release = isUpcoming
      ? new Date(today.getTime() + (i + 1) * 86_400_000)
      : new Date(today.getTime() - (i + 1) * 86_400_000);

    await prisma.movie.upsert({
      where: { tmdbId: m.tmdbId },
      update: { status, popularity: m.popularity },
      create: {
        tmdbId: m.tmdbId,
        slug: `${slugify(m.title)}-${m.tmdbId}`,
        title: m.title,
        originalTitle: m.originalTitle,
        overview: m.overview,
        posterUrl: m.posterUrl,
        backdropUrl: m.backdropUrl,
        runtimeMin: m.runtimeMin,
        releaseDate: release,
        ageRating: 'T13',
        status,
        voteAverage: m.voteAverage,
        voteCount: m.voteCount,
        popularity: m.popularity,
        language: m.language,
        genres: {
          create: m.genreIds
            .filter((id) => id != null)
            .map((id) => ({ genre: { connect: { id } } })),
        },
      },
    });
    if (isUpcoming) upcoming++;
    else now++;
  }

  console.info(`  • movies: ${movies.length} (${now} now showing, ${upcoming} coming soon)`);
}
