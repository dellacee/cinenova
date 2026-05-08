import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { type CreateBookingDraftRequest } from '@cinenova/shared';

import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { QrService } from '../../infra/qr/qr.service.js';
import { SeatLockService } from '../seats/seat-lock.service.js';
import { SeatsGateway } from '../seats/seats.gateway.js';
import { VouchersService } from '../vouchers/vouchers.service.js';

const SEAT_TYPE_MULTIPLIER = { STANDARD: 1, VIP: 1.4, COUPLE: 1.8 } as const;
const FORMAT_MULTIPLIER = { D2: 1, D3: 1.2, IMAX: 1.6 } as const;

interface ConfirmInput {
  provider: 'VNPAY' | 'STRIPE' | 'MOCK';
  providerRef: string;
  amountVnd: number;
  rawPayload: unknown;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatLock: SeatLockService,
    private readonly vouchers: VouchersService,
    private readonly seatsGateway: SeatsGateway,
    private readonly qr: QrService,
  ) {}

  /**
   * Create a PENDING booking. The user must already hold seat-locks for all
   * requested seats. Voucher is evaluated under FOR UPDATE row lock.
   */
  async createDraft(userId: string, input: CreateBookingDraftRequest) {
    // 1. Verify caller owns all seat-locks.
    const stale = await this.seatLock.verifyOwnership(input.showtimeId, input.seatIds, userId);
    if (stale.length > 0) {
      throw new ConflictException({ error: 'seat_locks_stale', staleSeatIds: stale });
    }

    // 2. Resolve showtime + seats + concession items in one round-trip.
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: input.showtimeId },
      include: { room: true, movie: true },
    });
    if (!showtime || showtime.isCancelled) {
      throw new NotFoundException('Showtime not found or cancelled');
    }

    const seats = await this.prisma.seat.findMany({
      where: { id: { in: input.seatIds }, roomId: showtime.roomId, isActive: true },
    });
    if (seats.length !== input.seatIds.length) {
      throw new BadRequestException('One or more seats are invalid for this showtime');
    }

    // 3. Compute pricing (idempotent function — no external state).
    const formatMult = FORMAT_MULTIPLIER[showtime.format];
    let seatsSubtotal = 0;
    const seatPrices = seats.map((s) => {
      const price = Math.round(showtime.basePriceVnd * SEAT_TYPE_MULTIPLIER[s.type] * formatMult);
      seatsSubtotal += price;
      return { seatId: s.id, priceSnapshotVnd: price };
    });

    let concessionsSubtotal = 0;
    const concessionLines: Array<{ itemId: string; qty: number; priceSnapshotVnd: number }> = [];
    if (input.concessions.length > 0) {
      const items = await this.prisma.concessionItem.findMany({
        where: { id: { in: input.concessions.map((c) => c.itemId) }, isActive: true },
      });
      const byId = new Map(items.map((i) => [i.id, i]));
      for (const c of input.concessions) {
        const item = byId.get(c.itemId);
        if (!item) throw new BadRequestException(`Concession '${c.itemId}' not available`);
        concessionsSubtotal += item.priceVnd * c.qty;
        concessionLines.push({ itemId: item.id, qty: c.qty, priceSnapshotVnd: item.priceVnd });
      }
    }

    const subtotal = seatsSubtotal + concessionsSubtotal;

    // 4. Persist booking + dependents inside a transaction. Voucher row is locked.
    const result = await this.prisma.$transaction(async (tx) => {
      let discount = 0;
      let voucherId: string | null = null;
      if (input.voucherCode) {
        const evalResult = await this.vouchers.evaluate(input.voucherCode, subtotal, tx);
        discount = evalResult.discountAppliedVnd;
        voucherId = evalResult.voucherId;
      }

      const final = Math.max(0, subtotal - discount);
      const expiresAt = new Date(Date.now() + 10 * 60_000);

      const booking = await tx.booking.create({
        data: {
          userId,
          showtimeId: showtime.id,
          status: 'PENDING',
          totalAmountVnd: subtotal,
          discountAmountVnd: discount,
          finalAmountVnd: final,
          expiresAt,
          seats: { create: seatPrices.map((p) => ({ seatId: p.seatId, showtimeId: showtime.id, priceSnapshotVnd: p.priceSnapshotVnd })) },
          concessions: concessionLines.length > 0 ? { create: concessionLines } : undefined,
          ...(voucherId
            ? { vouchers: { create: { voucherId, discountAppliedVnd: discount } } }
            : {}),
        },
      });

      return { booking, voucherId };
    });

    // 5. Extend Redis TTLs to cover the payment window.
    await Promise.all(
      input.seatIds.map((seatId) =>
        this.seatLock.extend(input.showtimeId, seatId, userId),
      ),
    );

    return {
      bookingId: result.booking.id,
      finalAmountVnd: result.booking.finalAmountVnd,
      discountAmountVnd: result.booking.discountAmountVnd,
      expiresAt: result.booking.expiresAt.toISOString(),
    };
  }

  /**
   * Move a booking from PENDING to CONFIRMED on payment success.
   * Idempotent on Payment.providerRef.
   */
  async confirm(bookingId: string, input: ConfirmInput) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { seats: true, vouchers: true },
    });
    if (!booking) throw new NotFoundException(`Booking '${bookingId}' not found`);

    // Idempotency check — re-runs of the same webhook are no-ops.
    const existingPayment = await this.prisma.payment.findUnique({ where: { providerRef: input.providerRef } });
    if (existingPayment) {
      this.logger.warn(`Duplicate webhook for providerRef ${input.providerRef} — ignoring`);
      return { bookingId: booking.id, status: booking.status };
    }

    if (booking.status !== 'PENDING') {
      throw new ConflictException(`Booking already in status ${booking.status}`);
    }

    const { token, qrDataUrl } = await this.qr.mintTicketQr(booking.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          provider: input.provider,
          providerRef: input.providerRef,
          status: 'PAID',
          amountVnd: input.amountVnd,
          rawPayload: input.rawPayload as object,
          paidAt: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), qrToken: token, paymentRef: input.providerRef },
      });

      for (const v of booking.vouchers) {
        await this.vouchers.incrementUsage(v.voucherId, tx);
      }
    });

    // Cleanup + broadcast outside the transaction.
    await this.seatLock.releaseAll(booking.showtimeId);
    this.seatsGateway.broadcastSold(
      booking.showtimeId,
      booking.seats.map((s) => s.seatId),
    );

    return { bookingId: booking.id, status: 'CONFIRMED', qrDataUrl };
  }

  async fail(bookingId: string, rawPayload: unknown) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== 'PENDING') return;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          provider: 'MOCK',
          providerRef: `failed-${booking.id}-${Date.now()}`,
          status: 'FAILED',
          amountVnd: booking.finalAmountVnd,
          rawPayload: rawPayload as object,
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'payment_failed' },
      });
    });

    // Locks expire on their own TTL; broadcast immediately so other users see seats free.
    const seats = await this.prisma.bookingSeat.findMany({ where: { bookingId } });
    this.seatsGateway.broadcastReleased(
      booking.showtimeId,
      seats.map((s) => s.seatId),
    );
  }

  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException(`Booking '${bookingId}' not found`);
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'PENDING') throw new ConflictException(`Cannot cancel — status ${booking.status}`);

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'user_cancelled' },
    });

    const seats = await this.prisma.bookingSeat.findMany({ where: { bookingId } });
    for (const s of seats) await this.seatLock.release(booking.showtimeId, s.seatId, userId);
    this.seatsGateway.broadcastReleased(
      booking.showtimeId,
      seats.map((s) => s.seatId),
    );

    return { bookingId, status: 'CANCELLED' };
  }

  async listMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        showtime: { include: { movie: true, room: { include: { theater: true } } } },
        seats: { include: { seat: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getMine(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        showtime: { include: { movie: true, room: { include: { theater: true } } } },
        seats: { include: { seat: true } },
        concessions: { include: { item: true } },
        vouchers: { include: { voucher: true } },
        payments: true,
      },
    });
    if (!booking || booking.userId !== userId) throw new NotFoundException(`Booking '${bookingId}' not found`);
    return booking;
  }

  /** Cron job — find PENDING expired bookings and release their resources. */
  async expireOverdue() {
    const overdue = await this.prisma.booking.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      include: { seats: true },
      take: 100,
    });

    for (const b of overdue) {
      await this.prisma.booking.update({
        where: { id: b.id },
        data: { status: 'EXPIRED', cancelledAt: new Date(), cancelReason: 'auto_expired' },
      });
      for (const s of b.seats) {
        await this.seatLock.release(b.showtimeId, s.seatId, b.userId);
      }
      this.seatsGateway.broadcastReleased(b.showtimeId, b.seats.map((s) => s.seatId));
    }
    return overdue.length;
  }
}
