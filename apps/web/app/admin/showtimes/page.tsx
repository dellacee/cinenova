'use client';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatDateTime, formatVnd } from '@/lib/utils';

interface ShowtimeRow {
  id: string;
  startAt: string;
  format: 'D2' | 'D3' | 'IMAX';
  basePriceVnd: number;
  isCancelled: boolean;
  movie: { title: string };
  room: { name: string; theater: { name: string; city: string } };
}

export default function AdminShowtimesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data } = useQuery<ShowtimeRow[]>({
    queryKey: ['admin', 'showtimes'],
    enabled: !!token,
    queryFn: () => apiFetch('/showtimes', { token }),
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Suất chiếu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lịch chiếu cho 14 ngày tới. Form thêm/sửa sẽ có ở phiên bản tiếp theo.
      </p>

      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Phim</th>
              <th className="px-4 py-3 text-left">Rạp · Phòng</th>
              <th className="px-4 py-3 text-left">Thời gian</th>
              <th className="px-4 py-3 text-left">Định dạng</th>
              <th className="px-4 py-3 text-right">Giá cơ bản</th>
            </tr>
          </thead>
          <tbody>
            {data?.slice(0, 100).map((s) => (
              <tr key={s.id} className={`border-b ${s.isCancelled ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{s.movie.title}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {s.room.theater.name} · {s.room.name}
                </td>
                <td className="px-4 py-3 text-xs">{formatDateTime(s.startAt)}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{s.format}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-xs">{formatVnd(s.basePriceVnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
