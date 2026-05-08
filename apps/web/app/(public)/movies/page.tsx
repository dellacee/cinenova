import { MovieCard, type MovieCardItem } from '@/components/movies/movie-card';
import { serverFetch } from '@/lib/api-client';

interface MoviesResponse {
  data: MovieCardItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default async function MoviesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; genre?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;

  const movies = await serverFetch<MoviesResponse>('/movies', {
    query: {
      status: sp.status,
      genre: sp.genre,
      search: sp.search,
      page: sp.page ?? '1',
      limit: 24,
    },
    revalidate: 30,
  }).catch(() => ({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 0 } }));

  const title =
    sp.status === 'NOW_SHOWING'
      ? 'Phim đang chiếu'
      : sp.status === 'COMING_SOON'
        ? 'Phim sắp chiếu'
        : 'Tất cả phim';

  return (
    <div className="container py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">{movies.meta.total} phim</p>

      {movies.data.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">Không có phim nào phù hợp.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.data.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
}
