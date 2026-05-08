import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { serverFetch } from '@/lib/api-client';

/**
 * Payment provider redirects users back here after checkout. We hand the query
 * params directly to the API webhook endpoint to validate the signature and
 * mutate the booking. The page just renders the result.
 */
export default async function BookingReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const provider = sp.provider ?? (sp.vnp_TransactionNo ? 'vnpay' : 'mock');

  const result = await serverFetch<{ ok: boolean; status?: string }>(
    `/bookings/webhook/${provider}/return`,
    { query: sp, revalidate: false },
  ).catch(() => ({ ok: false, status: 'FAILED' }));

  const success = result.ok && result.status === 'CONFIRMED';
  const bookingId = sp.bookingId ?? sp.vnp_TxnRef;

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-10 text-center shadow-xl">
        {success ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            <h1 className="mt-4 font-display text-2xl font-bold">Đặt vé thành công</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vé đã được gửi vào email của bạn. Vui lòng đến rạp 15 phút trước giờ chiếu.
            </p>
            {bookingId && (
              <Button asChild className="mt-6 bg-brand hover:bg-brand-600">
                <Link href={`/booking/${bookingId}/success` as never}>Xem vé</Link>
              </Button>
            )}
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold">Thanh toán không thành công</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Đơn hàng đã bị huỷ. Bạn có thể chọn lại ghế và thử lại.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/movies?status=NOW_SHOWING">Quay lại</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
