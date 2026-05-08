'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';

interface SummaryResponse {
  bullets: string[];
  overall_sentiment: number;
  review_count: number;
}

export function ReviewSummaryCard({ movieId }: { movieId: string }) {
  const { data, isLoading } = useQuery<SummaryResponse>({
    queryKey: ['ai', 'review-summary', movieId],
    queryFn: () =>
      apiFetch(`/ai/summarize-reviews/${movieId}`, { method: 'POST' }),
    staleTime: 24 * 60 * 60_000,
    retry: 0,
  });

  if (isLoading) return null;
  if (!data) return null;

  const positive = data.overall_sentiment >= 0;
  const sentimentLabel =
    data.overall_sentiment > 0.4
      ? 'Tích cực'
      : data.overall_sentiment > -0.4
        ? 'Trung tính'
        : 'Tiêu cực';

  return (
    <Card className="border-brand/20 bg-gradient-to-br from-brand/5 to-purple-500/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <h3 className="font-display text-sm font-bold">Tóm tắt từ AI</h3>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-background/50 px-2 py-0.5 text-xs">
            {positive ? <ThumbsUp className="h-3 w-3 text-emerald-500" /> : <ThumbsDown className="h-3 w-3 text-red-500" />}
            {sentimentLabel}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {data.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground/70">
          Dựa trên {data.review_count} đánh giá gần nhất.
        </p>
      </CardContent>
    </Card>
  );
}
