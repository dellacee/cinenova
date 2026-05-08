'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

import { MovieCard, type MovieCardItem } from '@/components/movies/movie-card';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface Recommendation {
  id: string;
  slug: string;
  title: string;
  poster_url: string | null;
  score: number;
}

/**
 * Personalized "For You" shelf — only renders when AI service returns at least
 * one recommendation. Falls back gracefully to nothing if AI is offline.
 */
export function RecommendShelf() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery<Recommendation[]>({
    queryKey: ['ai', 'recommend', user?.id ?? 'anon'],
    queryFn: () =>
      apiFetch('/ai/recommend', { query: { userId: user?.id, limit: 10 } }),
    staleTime: 5 * 60_000,
    retry: 0,
  });

  if (isLoading || !data || data.length === 0) return null;

  const movies: MovieCardItem[] = data.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    posterUrl: r.poster_url,
    voteAverage: null,
    status: 'NOW_SHOWING',
    ageRating: 'T13',
    genres: [],
  }));

  return (
    <section className="border-y border-brand/20 bg-gradient-to-br from-brand/5 via-transparent to-purple-500/5 py-12">
      <div className="container">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {user ? 'Dành cho bạn' : 'AI gợi ý'}
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {user ? 'Cá nhân hoá theo lịch sử đặt vé' : 'Đăng nhập để cá nhân hoá'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {movies.slice(0, 10).map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      </div>
    </section>
  );
}
