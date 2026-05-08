'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { LoginRequest } from '@cinenova/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export function SignInForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(LoginRequest) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await apiFetch<{ user: unknown; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(values) },
      );
      setAuth(result.user as never, result.tokens.accessToken, result.tokens.refreshToken);
      toast.success('Đăng nhập thành công');
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Email hoặc mật khẩu không đúng');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" error={formState.errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register('email')}
        />
      </Field>
      <Field label="Mật khẩu" error={formState.errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register('password')} />
      </Field>

      <Button type="submit" className="w-full bg-brand hover:bg-brand-600" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Đang xử lý…' : 'Đăng nhập'}
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
