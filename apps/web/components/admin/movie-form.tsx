'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const STATUS_OPTIONS = ['COMING_SOON', 'NOW_SHOWING', 'ARCHIVED'] as const;
const RATING_OPTIONS = ['P', 'K', 'T13', 'T16', 'T18', 'C'] as const;

interface FormValues {
  title: string;
  originalTitle?: string;
  overview: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerYoutubeId?: string;
  runtimeMin: number;
  releaseDate: string;
  ageRating: (typeof RATING_OPTIONS)[number];
  status: (typeof STATUS_OPTIONS)[number];
  language: string;
  tmdbId?: number;
}

export function MovieForm({
  mode,
  id,
  initial,
  onSuccess,
}: {
  mode: 'create' | 'update';
  id?: string;
  initial?: Record<string, unknown>;
  onSuccess: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      title: (initial?.title as string) ?? '',
      originalTitle: (initial?.originalTitle as string) ?? '',
      overview: (initial?.overview as string) ?? '',
      posterUrl: (initial?.posterUrl as string) ?? '',
      backdropUrl: (initial?.backdropUrl as string) ?? '',
      trailerYoutubeId: (initial?.trailerYoutubeId as string) ?? '',
      runtimeMin: (initial?.runtimeMin as number) ?? 100,
      releaseDate:
        typeof initial?.releaseDate === 'string'
          ? initial.releaseDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      ageRating: ((initial?.ageRating as 'T13') ?? 'T13'),
      status: ((initial?.status as 'COMING_SOON') ?? 'COMING_SOON'),
      language: (initial?.language as string) ?? 'vi',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        ...values,
        releaseDate: new Date(values.releaseDate).toISOString(),
        runtimeMin: Number(values.runtimeMin),
        genreIds: [],
      };
      return apiFetch(mode === 'create' ? '/admin/movies' : `/admin/movies/${id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        token,
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Đã thêm phim' : 'Đã cập nhật');
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Lưu thất bại'),
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên phim *" error={formState.errors.title?.message}>
          <Input {...register('title', { required: 'Bắt buộc' })} />
        </Field>
        <Field label="Tên gốc">
          <Input {...register('originalTitle')} />
        </Field>
      </div>

      <Field label="Mô tả *" error={formState.errors.overview?.message}>
        <textarea
          {...register('overview', { required: 'Bắt buộc' })}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Poster URL">
          <Input {...register('posterUrl')} type="url" />
        </Field>
        <Field label="Backdrop URL">
          <Input {...register('backdropUrl')} type="url" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Thời lượng (phút) *">
          <Input type="number" {...register('runtimeMin', { valueAsNumber: true, min: 1 })} />
        </Field>
        <Field label="Ngày khởi chiếu *">
          <Input type="date" {...register('releaseDate')} />
        </Field>
        <Field label="Trailer YouTube ID">
          <Input {...register('trailerYoutubeId')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Trạng thái">
          <select
            {...register('status')}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'NOW_SHOWING' ? 'Đang chiếu' : s === 'COMING_SOON' ? 'Sắp chiếu' : 'Đã lưu trữ'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Giới hạn độ tuổi">
          <select
            {...register('ageRating')}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ngôn ngữ">
          <Input {...register('language')} placeholder="vi" />
        </Field>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit" className="bg-brand hover:bg-brand-600" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang lưu…' : mode === 'create' ? 'Thêm phim' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
