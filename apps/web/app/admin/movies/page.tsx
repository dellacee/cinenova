'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate } from '@/lib/utils';

interface MovieRow {
  id: string;
  slug: string;
  title: string;
  status: 'NOW_SHOWING' | 'COMING_SOON' | 'ARCHIVED';
  ageRating: string;
  runtimeMin: number;
  releaseDate: string;
  genres: Array<{ id: number; name: string }>;
}

export default function AdminMoviesPage() {
  const [search, setSearch] = useState('');
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const { data } = useQuery<{ data: MovieRow[]; meta: { total: number } }>({
    queryKey: ['admin', 'movies', search],
    enabled: !!token,
    queryFn: () => apiFetch('/admin/movies', { token, query: { search, limit: 50 } }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/movies/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      toast.success('Đã xoá phim');
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
    },
    onError: () => toast.error('Không xoá được'),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Quản lý phim</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng: {data?.meta.total ?? '—'} phim đang hoạt động.
          </p>
        </div>
        <Button asChild className="bg-brand hover:bg-brand-600">
          <Link href="/admin/movies/new">
            <Plus className="h-4 w-4" />
            Thêm phim
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex gap-3">
        <Input
          placeholder="Tìm theo tên phim..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Phim</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Khởi chiếu</th>
              <th className="px-4 py-3">Thời lượng</th>
              <th className="px-4 py-3">Thể loại</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((m) => (
              <tr key={m.id} className="border-b transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.status === 'NOW_SHOWING' ? 'brand' : 'secondary'}>
                    {m.status === 'NOW_SHOWING' ? 'Đang chiếu' : m.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Đã lưu trữ'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{formatDate(m.releaseDate)}</td>
                <td className="px-4 py-3 text-sm">{m.runtimeMin}'</td>
                <td className="px-4 py-3 text-xs">
                  {m.genres.slice(0, 2).map((g) => g.name).join(', ')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/admin/movies/${m.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Xoá phim "${m.title}"?`)) deleteMutation.mutate(m.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {!data?.data.length && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Không có phim nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
