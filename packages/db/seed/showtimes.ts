import type { PrismaClient } from '../src/index.js';

const SLOTS = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30'];
const FORMATS = ['D2', 'D2', 'D3', 'D2', 'D3', 'IMAX'] as const;
const BASE_PRICES_VND = { D2: 90_000, D3: 120_000, IMAX: 180_000 } as const;

/**
 * Generate ~200 showtimes across the next 14 days.
 * Strategy:
 *   - Take all NOW_SHOWING movies + first 5 COMING_SOON.
 *   - For each room, distribute movies across daily slots.
 */
export async function seedShowtimes(prisma: PrismaClient) {
  const movies = await prisma.movie.findMany({
    where: { OR: [{ status: 'NOW_SHOWING' }, { status: 'COMING_SOON' }] },
    take: 25,
    orderBy: { popularity: 'desc' },
  });
  const rooms = await prisma.screeningRoom.findMany({ where: { isActive: true } });

  if (movies.length === 0 || rooms.length === 0) {
    console.warn('  ! Skipping showtimes: missing movies or rooms');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let count = 0;
  const days = 14;
  const targetTotal = 200;
  const perDay = Math.ceil(targetTotal / days);

  for (let d = 0; d < days; d++) {
    let placedToday = 0;
    for (const room of rooms) {
      for (let s = 0; s < SLOTS.length && placedToday < perDay; s++) {
        const slot = SLOTS[s];
        if (!slot) continue;
        const [hh, mm] = slot.split(':').map(Number);
        const startAt = new Date(today);
        startAt.setDate(today.getDate() + d);
        startAt.setHours(hh ?? 0, mm ?? 0, 0, 0);

        // Skip past slots for today.
        if (d === 0 && startAt < new Date()) continue;

        const movie = movies[(d * 7 + s + room.colsCount) % movies.length];
        if (!movie) continue;

        const format = FORMATS[s % FORMATS.length] ?? 'D2';
        const endAt = new Date(startAt.getTime() + (movie.runtimeMin + 15) * 60_000);
        const basePriceVnd = BASE_PRICES_VND[format];

        await prisma.showtime.upsert({
          where: { roomId_startAt: { roomId: room.id, startAt } },
          update: {},
          create: {
            movieId: movie.id,
            roomId: room.id,
            startAt,
            endAt,
            format,
            basePriceVnd,
          },
        });
        count++;
        placedToday++;
        if (count >= targetTotal) break;
      }
      if (count >= targetTotal) break;
    }
    if (count >= targetTotal) break;
  }

  console.info(`  • showtimes: ${count} across ${days} days`);
}
