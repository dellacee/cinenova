import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, Globe, Star, Youtube } from 'lucide-react';

import { ReviewSummaryCard } from '@/components/ai/review-summary-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { serverFetch, ApiError } from '@/lib/api-client';
import { formatDate, formatDateTime, formatTime, formatVnd, tmdbImage } from '@/lib/utils';

interface Movie {
  id: string;
  slug: string;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerYoutubeId: string | null;
  runtimeMin: number;
  releaseDate: string;
  ageRating: string;
  status: 'NOW_SHOWING' | 'COMING_SOON' | 'ARCHIVED';
  voteAverage: number | null;
  voteCount: number | null;
  language: string;
  genres: Array<{ id: number; name: string; slug: string }>;
}

interface ShowtimeRow {
  id: string;
  startAt: string;
  format: 'D2' | 'D3' | 'IMAX';
  basePriceVnd: number;
  room: { id: string; name: string; theater: { id: string; slug: string; name: string; city: string } };
}

export default async function MovieDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let movie: Movie;
  try {
    movie = await serverFetch<Movie>(`/movies/${slug}`, { revalidate: 60 });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const showtimes = await serverFetch<ShowtimeRow[]>('/showtimes', {
    query: { movieId: movie.id },
    revalidate: 30,
  }).catch(() => []);

  const groupedByDate = groupByDate(showtimes);

  return (
    <article>
      <BackdropHeader movie={movie} />

      <div className="container -mt-32 grid gap-12 pb-16 md:grid-cols-[280px_1fr]">
        <div className="relative -mt-12 aspect-[2/3] w-full max-w-[280px] overflow-hidden rounded-xl border-4 border-background shadow-2xl">
          {movie.posterUrl ? (
            <Image src={tmdbImage(movie.posterUrl, 'w500') ?? ''} alt={movie.title} fill className="object-cover" />
          ) : null}
        </div>

        <div className="space-y-6 pt-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={movie.status === 'NOW_SHOWING' ? 'brand' : 'secondary'}>
                {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
              </Badge>
              <Badge variant="outline">{movie.ageRating}</Badge>
              {movie.genres.map((g) => (
                <Badge key={g.id} variant="secondary">
                  {g.name}
                </Badge>
              ))}
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">{movie.title}</h1>
          </div>

          <Meta icon={Clock} label={`${movie.runtimeMin} phút`} />
          <Meta icon={Calendar} label={`Khởi chiếu ${formatDate(movie.releaseDate)}`} />
          <Meta icon={Globe} label={movie.language.toUpperCase()} />
          {movie.voteAverage != null && (
            <Meta
              icon={Star}
              label={`${movie.voteAverage.toFixed(1)} / 10 (${movie.voteCount?.toLocaleString() ?? 0} đánh giá)`}
            />
          )}

          <p className="text-base leading-relaxed text-muted-foreground">{movie.overview}</p>

          <ReviewSummaryCard movieId={movie.id} />

          {movie.trailerYoutubeId && (
            <Button asChild variant="outline">
              <a
                href={`https://www.youtube.com/watch?v=${movie.trailerYoutubeId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Youtube className="h-4 w-4 text-red-500" />
                Xem trailer
              </a>
            </Button>
          )}
        </div>
      </div>

      {movie.status === 'NOW_SHOWING' && (
        <section className="border-t bg-muted/20 py-12">
          <div className="container">
            <h2 className="font-display text-3xl font-bold tracking-tight">Lịch chiếu</h2>
            {Object.keys(groupedByDate).length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Chưa có lịch chiếu công khai.</p>
            ) : (
              <div className="mt-8 space-y-8">
                {Object.entries(groupedByDate).map(([date, items]) => (
                  <div key={date}>
                    <h3 className="text-lg font-semibold">{formatDateTime(date).split(',')[0]}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {items.map((s) => (
                        <Link
                          key={s.id}
                          href={`/booking/${s.id}` as never}
                          className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:border-brand hover:shadow-md hover:shadow-brand/20"
                        >
                          <div>
                            <div className="text-lg font-semibold">{formatTime(s.startAt)}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {s.room.theater.name} · {s.room.name}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="brand">{s.format}</Badge>
                            <div className="mt-1 text-xs text-muted-foreground">
                              từ {formatVnd(s.basePriceVnd)}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </article>
  );
}

function BackdropHeader({ movie }: { movie: Movie }) {
  const backdrop = tmdbImage(movie.backdropUrl, 'original') ?? tmdbImage(movie.posterUrl, 'w780');
  return (
    <div className="relative h-[400px] w-full overflow-hidden md:h-[500px]">
      {backdrop ? (
        <Image src={backdrop} alt={movie.title} fill priority className="object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
    </div>
  );
}

function Meta({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}

function groupByDate(showtimes: ShowtimeRow[]) {
  const grouped: Record<string, ShowtimeRow[]> = {};
  for (const s of showtimes) {
    const date = s.startAt.slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  }
  return grouped;
}
