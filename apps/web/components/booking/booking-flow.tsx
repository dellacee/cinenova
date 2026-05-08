'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatDateTime, formatVnd } from '@/lib/utils';

import { SeatPicker, type SeatItem } from './seat-picker';

const FORMAT_MULT = { D2: 1, D3: 1.2, IMAX: 1.6 } as const;
const TYPE_MULT = { STANDARD: 1, VIP: 1.4, COUPLE: 1.8 } as const;

interface ConcessionItem {
  id: string;
  name: string;
  type: 'COMBO' | 'POPCORN' | 'DRINK' | 'SNACK';
  priceVnd: number;
  description: string | null;
}

interface ShowtimeDetail {
  id: string;
  startAt: string;
  format: 'D2' | 'D3' | 'IMAX';
  basePriceVnd: number;
  movie: { id: string; title: string; ageRating: string };
  room: {
    id: string;
    name: string;
    rowsCount: number;
    colsCount: number;
    layoutJson: { rows: string[]; cols: number; vipRows?: string[]; coupleRows?: string[] };
    theater: { name: string; city: string; addressLine: string };
    seats: SeatItem[];
  };
  soldSeatIds: string[];
}

export function BookingFlow({
  showtime,
  concessions,
}: {
  showtime: ShowtimeDetail;
  concessions: ConcessionItem[];
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [combos, setCombos] = useState<Record<string, number>>({});
  const [voucherCode, setVoucherCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatMult = FORMAT_MULT[showtime.format];

  const seatsTotal = useMemo(() => {
    let total = 0;
    for (const id of selectedSeats) {
      const seat = showtime.room.seats.find((s) => s.id === id);
      if (!seat) continue;
      total += Math.round(showtime.basePriceVnd * TYPE_MULT[seat.type] * formatMult);
    }
    return total;
  }, [selectedSeats, showtime.room.seats, showtime.basePriceVnd, formatMult]);

  const combosTotal = useMemo(() => {
    let total = 0;
    for (const [itemId, qty] of Object.entries(combos)) {
      const item = concessions.find((c) => c.id === itemId);
      if (item) total += item.priceVnd * qty;
    }
    return total;
  }, [combos, concessions]);

  const subtotal = seatsTotal + combosTotal;

  if (!user || !accessToken) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <h2 className="font-display text-xl font-bold">Cần đăng nhập</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui lòng đăng nhập để chọn ghế và đặt vé.
        </p>
        <Button asChild className="mt-4 bg-brand hover:bg-brand-600">
          <a href={`/auth/signin?redirect=/booking/${showtime.id}`}>Đăng nhập</a>
        </Button>
      </div>
    );
  }

  const submit = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ghế');
      return;
    }
    setSubmitting(true);
    try {
      const draft = await apiFetch<{ bookingId: string; finalAmountVnd: number }>('/bookings/draft', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          showtimeId: showtime.id,
          seatIds: selectedSeats,
          concessions: Object.entries(combos)
            .filter(([, q]) => q > 0)
            .map(([itemId, qty]) => ({ itemId, qty })),
          ...(voucherCode ? { voucherCode } : {}),
        }),
      });

      const checkout = await apiFetch<{ url: string }>(`/payments/${draft.bookingId}/checkout`, {
        method: 'POST',
        token: accessToken,
      });

      window.location.href = checkout.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không tạo được booking');
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">{showtime.movie.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {showtime.room.theater.name} · {showtime.room.name} · {showtime.format} ·{' '}
              {formatDateTime(showtime.startAt)}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chọn ghế</CardTitle>
          </CardHeader>
          <CardContent>
            <SeatPicker
              showtimeId={showtime.id}
              userId={user.id}
              seats={showtime.room.seats}
              rowsCount={showtime.room.rowsCount}
              colsCount={showtime.room.colsCount}
              vipRows={showtime.room.layoutJson.vipRows}
              coupleRows={showtime.room.layoutJson.coupleRows}
              soldSeatIds={showtime.soldSeatIds}
              basePriceVnd={showtime.basePriceVnd}
              formatMultiplier={formatMult}
              selected={selectedSeats}
              onSelectionChange={setSelectedSeats}
            />
          </CardContent>
        </Card>

        {concessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Combo bắp nước</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {concessions.map((c) => (
                  <ComboItem
                    key={c.id}
                    item={c}
                    qty={combos[c.id] ?? 0}
                    onChange={(qty) => setCombos((prev) => ({ ...prev, [c.id]: qty }))}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin đơn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label={`Ghế (${selectedSeats.length})`} value={formatVnd(seatsTotal)} />
            <Row label="Combo" value={formatVnd(combosTotal)} />
            <div className="border-t pt-4">
              <Input
                placeholder="Mã giảm giá (nếu có)"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm font-medium">Tạm tính</span>
              <span className="font-display text-2xl font-bold text-brand-500">{formatVnd(subtotal)}</span>
            </div>
            <Button
              onClick={submit}
              disabled={submitting || selectedSeats.length === 0}
              className="w-full bg-brand hover:bg-brand-600"
              size="lg"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tiến hành thanh toán'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Ghế giữ trong 5 phút. Thanh toán hoàn tất trong 10 phút kể từ khi xác nhận.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ComboItem({
  item,
  qty,
  onChange,
}: {
  item: ConcessionItem;
  qty: number;
  onChange: (qty: number) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${qty > 0 ? 'border-brand bg-brand/5' : ''}`}>
      <div className="text-sm font-semibold">{item.name}</div>
      {item.description && (
        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</div>
      )}
      <div className="mt-2 text-xs font-medium text-brand-500">{formatVnd(item.priceVnd)}</div>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onChange(Math.max(0, qty - 1))}>
          −
        </Button>
        <span className="min-w-[1.5rem] text-center text-sm font-semibold">{qty}</span>
        <Button size="sm" variant="outline" onClick={() => onChange(Math.min(10, qty + 1))}>
          +
        </Button>
      </div>
    </div>
  );
}
