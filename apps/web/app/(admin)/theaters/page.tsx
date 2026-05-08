'use client';

import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface TheaterRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  district: string | null;
  addressLine: string;
  rooms: Array<{ id: string; name: string; rowsCount: number; colsCount: number }>;
}

export default function AdminTheatersPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data } = useQuery<TheaterRow[]>({
    queryKey: ['admin', 'theaters'],
    enabled: !!token,
    queryFn: () => apiFetch('/theaters', { token }),
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Hệ thống rạp</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mỗi rạp gồm nhiều phòng chiếu, mỗi phòng có sơ đồ ghế riêng.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((t) => (
          <Card key={t.id} className="p-5">
            <h3 className="font-display text-lg font-bold">{t.name}</h3>
            <p className="text-xs text-muted-foreground">
              {t.district ? `${t.district}, ` : ''}
              {t.city}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t.addressLine}</p>
            <div className="mt-4 space-y-1 border-t pt-3">
              {t.rooms.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">
                    {r.rowsCount} hàng × {r.colsCount} cột
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
