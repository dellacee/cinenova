'use client';

import { useRouter } from 'next/navigation';

import { MovieForm } from '@/components/admin/movie-form';

export default function AdminNewMoviePage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Thêm phim mới</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nhập metadata phim. TMDb ID là tuỳ chọn — nếu có sẽ giúp đồng bộ poster + trailer tự động.
      </p>

      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <MovieForm
          mode="create"
          onSuccess={() => router.replace('/admin/movies')}
        />
      </div>
    </div>
  );
}
