import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { Hero } from '@/components/home/hero';
import { MovieCard, type MovieCardItem } from '@/components/movies/movie-card';
import { Button } from '@/components/ui/button';
import { serverFetch } from '@/lib/api-client';

interface MoviesResponse {
  data: MovieCardItem[];
}

export default async function HomePage() {
  const [nowShowing, comingSoon] = await Promise.allSettled([
    serverFetch<MoviesResponse>('/movies', { query: { status: 'NOW_SHOWING', limit: 10 }, revalidate: 60 }),
    serverFetch<MoviesResponse>('/movies', { query: { status: 'COMING_SOON', limit: 10 }, revalidate: 60 }),
  ]);

  return (
    <>
      <Hero />

      <Section
        title="Đang chiếu"
        href="/movies?status=NOW_SHOWING"
        movies={nowShowing.status === 'fulfilled' ? nowShowing.value.data : []}
      />
      <Section
        title="Sắp chiếu"
        href="/movies?status=COMING_SOON"
        movies={comingSoon.status === 'fulfilled' ? comingSoon.value.data : []}
        muted
      />
    </>
  );
}

function Section({
  title,
  href,
  movies,
  muted,
}: {
  title: string;
  href: string;
  movies: MovieCardItem[];
  muted?: boolean;
}) {
  return (
    <section className={muted ? 'bg-muted/20 py-16' : 'py-16'}>
      <div className="container">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href={href as never}>
              Xem tất cả
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {movies.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            Không tải được dữ liệu — kiểm tra API có đang chạy chưa (port 4000) và đã chạy
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5">pnpm db:seed</code> chưa.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
