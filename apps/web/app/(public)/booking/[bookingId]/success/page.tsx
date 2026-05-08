import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';

import { Button } from '@/components/ui/button';

/**
 * Static success page (no booking detail fetch — keeps it usable in Vercel SSR
 * without leaking auth tokens). The actual booking history is in /account.
 */
export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-10 text-center shadow-xl">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 font-display text-3xl font-bold">Đặt vé thành công</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Đưa mã QR này cho nhân viên rạp để vào phòng chiếu.
        </p>

        <div className="mx-auto mt-8 w-fit rounded-2xl bg-white p-6">
          <QRCodeCanvas value={bookingId} size={220} level="M" />
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground">{bookingId}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-brand hover:bg-brand-600">
            <Link href="/account/bookings">Xem lịch sử đặt vé</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
