import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import {
  type CreateShowtimeRequest,
  type ShowtimesQuery,
  type UpdateShowtimeRequest,
} from '@cinenova/shared';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class ShowtimesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ShowtimesQuery) {
    const where = {
      isCancelled: false,
      ...(q.movieId ? { movieId: q.movieId } : {}),
      ...(q.format ? { format: q.format } : {}),
      ...(q.date ? this.dateRange(q.date) : { startAt: { gte: new Date() } }),
      ...(q.theaterId ? { room: { theaterId: q.theaterId } } : {}),
      ...(q.city ? { room: { theater: { city: q.city } } } : {}),
    };

    return this.prisma.showtime.findMany({
      where,
      include: {
        movie: true,
        room: { include: { theater: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async getById(id: string) {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id },
      include: {
        movie: true,
        room: {
          include: {
            theater: true,
            seats: { orderBy: [{ row: 'asc' }, { col: 'asc' }] },
          },
        },
        bookings: {
          where: { status: 'CONFIRMED' },
          include: { seats: true },
        },
      },
    });
    if (!showtime) throw new NotFoundException(`Showtime '${id}' not found`);

    const soldSeatIds = new Set<string>();
    for (const booking of showtime.bookings) {
      for (const bs of booking.seats) soldSeatIds.add(bs.seatId);
    }

    return { ...showtime, soldSeatIds: Array.from(soldSeatIds) };
  }

  async create(input: CreateShowtimeRequest) {
    const movie = await this.prisma.movie.findFirst({ where: { id: input.movieId, deletedAt: null } });
    if (!movie) throw new NotFoundException(`Movie '${input.movieId}' not found`);

    const room = await this.prisma.screeningRoom.findFirst({ where: { id: input.roomId, deletedAt: null } });
    if (!room) throw new NotFoundException(`Room '${input.roomId}' not found`);

    const startAt = new Date(input.startAt);
    const endAt = new Date(startAt.getTime() + (movie.runtimeMin + 15) * 60_000);

    try {
      return await this.prisma.showtime.create({
        data: {
          movieId: input.movieId,
          roomId: input.roomId,
          startAt,
          endAt,
          format: input.format,
          basePriceVnd: input.basePriceVnd,
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException('A showtime already exists in this room at that start time');
      }
      throw e;
    }
  }

  async update(id: string, input: UpdateShowtimeRequest) {
    const existing = await this.prisma.showtime.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Showtime '${id}' not found`);
    if (existing.version !== input.version) {
      throw new ConflictException('Showtime was modified by someone else; refresh and retry');
    }

    const startAt = input.startAt ? new Date(input.startAt) : existing.startAt;
    return this.prisma.showtime.update({
      where: { id },
      data: {
        ...(input.movieId ? { movieId: input.movieId } : {}),
        ...(input.roomId ? { roomId: input.roomId } : {}),
        ...(input.startAt ? { startAt } : {}),
        ...(input.format ? { format: input.format } : {}),
        ...(input.basePriceVnd ? { basePriceVnd: input.basePriceVnd } : {}),
        version: { increment: 1 },
      },
    });
  }

  async cancel(id: string) {
    const existing = await this.prisma.showtime.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Showtime '${id}' not found`);
    return this.prisma.showtime.update({ where: { id }, data: { isCancelled: true } });
  }

  private dateRange(yyyymmdd: string) {
    const d = new Date(yyyymmdd);
    if (Number.isNaN(d.getTime())) return { startAt: { gte: new Date() } };
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { startAt: { gte: start, lte: end } };
  }
}
