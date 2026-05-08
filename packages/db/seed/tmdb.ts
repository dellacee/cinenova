/**
 * Tiny TMDb client used only by the seed step.
 * Falls back gracefully to a built-in fixture set if no key is configured,
 * so the seed never fails on a fresh clone.
 */
const BASE = process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3';
const KEY = process.env.TMDB_API_KEY;
const IMG = process.env.TMDB_IMAGE_BASE ?? 'https://image.tmdb.org/t/p/original';

export interface TmdbMovie {
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: Date;
  runtimeMin: number;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  language: string;
  genreIds: number[];
}

export async function fetchPopularMovies(limit = 30): Promise<TmdbMovie[]> {
  if (!KEY) {
    console.warn('  ! TMDB_API_KEY not set — using built-in fallback fixture');
    return FALLBACK_FIXTURE.slice(0, limit);
  }

  const collected: TmdbMovie[] = [];
  let page = 1;

  while (collected.length < limit && page <= 5) {
    const url = `${BASE}/movie/popular?api_key=${KEY}&language=en-US&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ! TMDb /movie/popular page ${page} failed (${res.status}) — using fallback`);
      return FALLBACK_FIXTURE.slice(0, limit);
    }
    const data = (await res.json()) as { results: Array<TmdbRawMovie> };
    for (const raw of data.results) {
      const detail = await fetchDetail(raw.id);
      if (detail) collected.push(detail);
      if (collected.length >= limit) break;
    }
    page += 1;
  }

  return collected;
}

interface TmdbRawMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  genre_ids?: number[];
}

interface TmdbRawDetail extends TmdbRawMovie {
  runtime: number | null;
  genres: Array<{ id: number; name: string }>;
}

async function fetchDetail(id: number): Promise<TmdbMovie | null> {
  const url = `${BASE}/movie/${id}?api_key=${KEY}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const d = (await res.json()) as TmdbRawDetail;
  return {
    tmdbId: d.id,
    title: d.title,
    originalTitle: d.original_title || null,
    overview: d.overview ?? '',
    posterUrl: d.poster_path ? `${IMG}${d.poster_path}` : null,
    backdropUrl: d.backdrop_path ? `${IMG}${d.backdrop_path}` : null,
    releaseDate: new Date(d.release_date || Date.now()),
    runtimeMin: d.runtime ?? 100,
    voteAverage: d.vote_average,
    voteCount: d.vote_count,
    popularity: d.popularity,
    language: d.original_language ?? 'en',
    genreIds: (d.genres ?? []).map((g) => g.id),
  };
}

/**
 * Minimal offline fixture used when no TMDb key is configured.
 * Generic placeholder data so the seed always succeeds on a fresh clone.
 */
const FALLBACK_FIXTURE: TmdbMovie[] = Array.from({ length: 30 }, (_, i) => ({
  tmdbId: 900000 + i,
  title: `Sample Feature ${String(i + 1).padStart(2, '0')}`,
  originalTitle: null,
  overview:
    'A placeholder synopsis used when no TMDb key is configured. ' +
    'Replace with real metadata by setting TMDB_API_KEY in your environment.',
  posterUrl: null,
  backdropUrl: null,
  releaseDate: new Date(Date.now() - i * 86_400_000),
  runtimeMin: 95 + (i % 5) * 10,
  voteAverage: 6.5 + ((i % 7) * 0.3),
  voteCount: 1000 + i * 47,
  popularity: 50 + i,
  language: 'en',
  genreIds: [[28, 12], [18, 10749], [35, 16], [27, 53], [878, 28]][i % 5] ?? [18],
}));
