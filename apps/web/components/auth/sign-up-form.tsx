'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { SignupRequest } from '@cinenova/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export function SignUpForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(SignupRequest) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await apiFetch<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/signup',
        { method: 'POST', body: JSON.stringify(values) },
      );
      setAuth(result.user as never, result.tokens.accessToken, result.tokens.refreshToken);
      toast.success('Tài khoản đã được tạo');
      router.push('/');
      router.refresh();
    } catch (err) {
      if (err instanceof Error && /409|exists/i.test(err.message)) {
        toast.error('Email đã được đăng ký');
      } else {
        toast.error('Không tạo được tài khoản');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Họ và tên" error={formState.errors.fullName?.message}>
        <Input autoComplete="name" {...register('fullName')} />
      </Field>
      <Field label="Email" error={formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...register('email')} />
      </Field>
      <Field label="Mật khẩu" error={formState.errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </Field>
      <Field label="Số điện thoại (tuỳ chọn)" error={formState.errors.phone?.message}>
        <Input type="tel" autoComplete="tel" {...register('phone')} />
      </Field>

      <Button type="submit" className="w-full bg-brand hover:bg-brand-600" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Đang tạo…' : 'Đăng ký'}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
