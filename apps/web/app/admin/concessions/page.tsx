'use client';

import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatVnd } from '@/lib/utils';

interface ConcessionItem {
  id: string;
  name: string;
  type: 'COMBO' | 'POPCORN' | 'DRINK' | 'SNACK';
  priceVnd: number;
  description: string | null;
  isActive: boolean;
}

export default function AdminConcessionsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data } = useQuery<ConcessionItem[]>({
    queryKey: ['admin', 'concessions'],
    enabled: !!token,
    queryFn: () => apiFetch('/concessions', { token }),
  });

  const grouped = data?.reduce<Record<string, ConcessionItem[]>>((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">F&B</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Combo, bắp, nước, snack có sẵn. Form CRUD đầy đủ trên roadmap.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {grouped &&
          Object.entries(grouped).map(([type, items]) => (
            <Card key={type} className="p-5">
              <h3 className="font-display text-lg font-bold">{type}</h3>
              <div className="mt-3 space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      {it.description && (
                        <div className="text-xs text-muted-foreground">{it.description}</div>
                      )}
                    </div>
                    <span className="font-semibold text-brand-500">{formatVnd(it.priceVnd)}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
