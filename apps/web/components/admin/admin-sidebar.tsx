'use client';

import {
  Building2,
  Clapperboard,
  Film,
  History,
  LayoutDashboard,
  LogOut,
  Popcorn,
  Ticket,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/admin/movies', label: 'Phim', icon: Film },
  { href: '/admin/theaters', label: 'Rạp', icon: Building2 },
  { href: '/admin/showtimes', label: 'Suất chiếu', icon: Tv },
  { href: '/admin/vouchers', label: 'Voucher', icon: Ticket },
  { href: '/admin/concessions', label: 'F&B', icon: Popcorn },
  { href: '/admin/bookings', label: 'Đặt vé', icon: Clapperboard },
  { href: '/admin/audit', label: 'Audit log', icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const logout = () => {
    clear();
    router.replace('/');
  };

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
      <div className="flex h-full flex-col">
        <div className="border-b px-6 py-5">
          <Link href="/" className="block font-display text-xl font-bold tracking-tight">
            Cine<span className="text-gradient-brand">Nova</span>
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Admin Console</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as never}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand/10 text-brand-500'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="text-xs">
            <div className="font-semibold">{user?.fullName}</div>
            <div className="text-muted-foreground">
              {user?.email} · <span className="font-medium">{user?.role}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </aside>
  );
}
