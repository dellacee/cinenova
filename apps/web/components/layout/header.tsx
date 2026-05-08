import Link from 'next/link';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/movies?status=NOW_SHOWING', label: 'Đang chiếu' },
  { href: '/movies?status=COMING_SOON', label: 'Sắp chiếu' },
  { href: '/theaters', label: 'Rạp' },
  { href: '/promotions', label: 'Ưu đãi' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="font-display text-xl font-bold tracking-tight">
            Cine<span className="text-gradient-brand">Nova</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/signin">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm" className="bg-brand hover:bg-brand-600">
            <Link href="/auth/signup">Đăng ký</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="cn" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="1" stopColor="#FF6B35" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#cn)" />
      <path
        d="M16 7l2.5 5 5.5.8-4 3.9.95 5.5L16 19.6 11.05 22.2 12 16.7l-4-3.9 5.5-.8L16 7z"
        fill="#fff"
      />
    </svg>
  );
}
