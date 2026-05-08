'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarCheck, DollarSign, Film, Ticket, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatVnd } from '@/lib/utils';

interface DashboardStats {
  movies: number;
  theaters: number;
  upcomingShowtimes: number;
  users: number;
  confirmedBookings: number;
  totalRevenueVnd: number;
}

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    enabled: !!token,
    queryFn: () => apiFetch('/admin/dashboard', { token }),
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Tổng quan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Hiệu suất hệ thống thời gian thực.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Film}
          label="Phim"
          value={data?.movies ?? '—'}
          loading={isLoading}
          accent="from-brand to-orange-500"
        />
        <StatCard icon={Building2} label="Rạp" value={data?.theaters ?? '—'} loading={isLoading} accent="from-purple-500 to-indigo-500" />
        <StatCard icon={CalendarCheck} label="Suất sắp tới" value={data?.upcomingShowtimes ?? '—'} loading={isLoading} accent="from-emerald-500 to-teal-500" />
        <StatCard icon={Users} label="Người dùng" value={data?.users ?? '—'} loading={isLoading} accent="from-blue-500 to-cyan-500" />
        <StatCard icon={Ticket} label="Vé đã bán" value={data?.confirmedBookings ?? '—'} loading={isLoading} accent="from-pink-500 to-rose-500" />
        <StatCard
          icon={DollarSign}
          label="Doanh thu"
          value={data ? formatVnd(data.totalRevenueVnd) : '—'}
          loading={isLoading}
          accent="from-yellow-500 to-amber-500"
          wide
        />
      </div>

      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="font-display text-lg font-bold">Hướng dẫn nhanh</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Vào mục <strong>Phim</strong> để thêm/sửa/xoá phim trong catalogue.</li>
            <li>• Mục <strong>Suất chiếu</strong> để lên lịch chiếu cho từng phim ở các phòng/rạp.</li>
            <li>• Mục <strong>Voucher</strong> để tạo mã giảm giá có hạn dùng + ngân sách.</li>
            <li>• Mọi thao tác CRUD đều được ghi vào <strong>Audit log</strong> kèm IP, user agent, diff payload.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
  wide,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  loading?: boolean;
  accent: string;
  wide?: boolean;
}) {
  return (
    <Card className={`overflow-hidden ${wide ? 'sm:col-span-2 lg:col-span-3 xl:col-span-2' : ''}`}>
      <CardContent className="relative p-5">
        <div className={`absolute right-0 top-0 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
        <div className="flex items-center gap-3">
          <div className={`rounded-lg bg-gradient-to-br ${accent} p-2.5 text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <div className="mt-4 font-display text-3xl font-bold">{loading ? '…' : value}</div>
      </CardContent>
    </Card>
  );
}
