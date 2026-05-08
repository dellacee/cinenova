import Link from 'next/link';

import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata = { title: 'Đăng nhập' };

export default function SignInPage() {
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">Đăng nhập</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quay lại CineNova. Phim hay đang chờ bạn.
          </p>
        </div>

        <SignInForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link href="/auth/signup" className="font-medium text-brand-500 hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
