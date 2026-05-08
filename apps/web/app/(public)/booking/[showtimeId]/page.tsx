import { notFound } from 'next/navigation';

import { BookingFlow } from '@/components/booking/booking-flow';
import { serverFetch, ApiError } from '@/lib/api-client';

interface ShowtimeDetail {
  id: string;
  startAt: string;
  endAt: string;
  format: 'D2' | 'D3' | 'IMAX';
  basePriceVnd: number;
  movie: { id: string; title: string; runtimeMin: number; posterUrl: string | null; ageRating: string };
  room: {
    id: string;
    name: string;
    rowsCount: number;
    colsCount: number;
    layoutJson: { rows: string[]; cols: number; vipRows?: string[]; coupleRows?: string[] };
    theater: { id: string; name: string; city: string; addressLine: string };
    seats: Array<{ id: string; row: string; col: number; type: 'STANDARD' | 'VIP' | 'COUPLE'; isActive: boolean }>;
  };
  soldSeatIds: string[];
}

interface ConcessionItem {
  id: string;
  name: string;
  type: 'COMBO' | 'POPCORN' | 'DRINK' | 'SNACK';
  priceVnd: number;
  description: string | null;
  imageUrl: string | null;
}

export default async function BookingPage({ params }: { params: Promise<{ showtimeId: string }> }) {
  const { showtimeId } = await params;

  let showtime: ShowtimeDetail;
  try {
    showtime = await serverFetch<ShowtimeDetail>(`/showtimes/${showtimeId}`, { revalidate: false });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const concessions = await serverFetch<ConcessionItem[]>('/concessions', {
    revalidate: 60,
  }).catch(() => []);

  return (
    <div className="container py-8">
      <BookingFlow showtime={showtime} concessions={concessions} />
    </div>
  );
}
