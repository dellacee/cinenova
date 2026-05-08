import Image from 'next/image';
import Link from 'next/link';
import { Play, Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { tmdbImage } from '@/lib/utils';

export interface MovieCardItem {
  id: string;
  slug: string;
  title: string;
  posterUrl: string | null;
  voteAverage: number | null;
  status: 'NOW_SHOWING' | 'COMING_SOON' | 'ARCHIVED';
  ageRating: string;
  genres?: Array<{ id: number; name: string; slug: string }>;
}

export function MovieCard({ movie }: { movie: MovieCardItem }) {
  const poster = tmdbImage(movie.posterUrl, 'w500');
  return (
    <Link
      href={`/movies/${movie.slug}` as never}
      className="group relative block overflow-hidden rounded-xl border border-border/40 bg-card transition-all hover:border-brand/50 hover:shadow-xl hover:shadow-brand/10"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {poster ? (
          <Image
            src={poster}
            alt={movie.title}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No poster</div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {movie.status === 'COMING_SOON' && <Badge variant="brand">Sắp chiếu</Badge>}
          <Badge variant="outline" className="bg-black/50 text-white backdrop-blur">
            {movie.ageRating}
          </Badge>
        </div>

        {movie.voteAverage != null && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {movie.voteAverage.toFixed(1)}
          </div>
        )}

        <div className="absolute inset-0 flex items-end justify-center p-4 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
            <Play className="h-4 w-4" />
            {movie.status === 'NOW_SHOWING' ? 'Đặt vé' : 'Xem chi tiết'}
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{movie.title}</h3>
        {movie.genres && movie.genres.length > 0 && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {movie.genres.slice(0, 3).map((g) => g.name).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}
