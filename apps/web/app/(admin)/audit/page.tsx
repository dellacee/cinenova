'use client';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatDateTime } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { email: string; fullName: string; role: string } | null;
}

export default function AuditLogPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data } = useQuery<AuditEntry[]>({
    queryKey: ['admin', 'audit'],
    enabled: !!token,
    queryFn: () => apiFetch('/admin/audit?limit=100', { token }),
    refetchInterval: 30_000,
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mọi thao tác CRUD do admin/staff thực hiện đều được ghi lại — không thể xoá.
      </p>

      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Thời gian</th>
              <th className="px-4 py-3 text-left">Người thực hiện</th>
              <th className="px-4 py-3 text-left">Hành động</th>
              <th className="px-4 py-3 text-left">Đối tượng</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</td>
                <td className="px-4 py-3">
                  {row.actor ? (
                    <>
                      <div>{row.actor.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.actor.email} · {row.actor.role}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">system</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{row.action}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div>{row.targetType}</div>
                  <div className="font-mono text-xs text-muted-foreground">{row.targetId}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.ip ?? '—'}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Chưa có hoạt động nào được ghi lại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
