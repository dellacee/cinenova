import Link from 'next/link';

import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata = { title: 'Đăng ký' };

export default function SignUpPage() {
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">Tạo tài khoản</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Đăng ký miễn phí để đặt vé và lưu lịch sử xem phim.
          </p>
        </div>

        <SignUpForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link href="/auth/signin" className="font-medium text-brand-500 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
