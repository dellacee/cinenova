import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="font-display text-7xl font-bold tracking-tight text-gradient-brand">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Trang bạn tìm không tồn tại.</p>
      <Button asChild className="mt-6 bg-brand hover:bg-brand-600">
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  );
}
