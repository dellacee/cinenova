'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { MovieForm } from '@/components/admin/movie-form';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export default function AdminEditMoviePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'movie', params.id],
    enabled: !!token,
    queryFn: () => apiFetch<Record<string, unknown>>(`/admin/movies?search=&page=1&limit=50`, { token }),
  });

  // We don't have a "by id" admin endpoint — use the list and find by id.
  const movie = (data as { data?: Array<{ id: string }> } | undefined)?.data?.find(
    (m) => m.id === params.id,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Sửa phim</h1>

      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <MovieForm
          mode="update"
          id={params.id}
          initial={movie as Record<string, unknown> | undefined}
          onSuccess={() => router.replace('/admin/movies')}
        />
      </div>
    </div>
  );
}
