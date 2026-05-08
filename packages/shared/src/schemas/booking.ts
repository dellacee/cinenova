import { z } from 'zod';

export const BookingStatus = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED']);

export const SeatLockEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('snapshot'), seats: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal('locked'), seatId: z.string(), userId: z.string() }),
  z.object({ type: z.literal('released'), seatId: z.string() }),
  z.object({ type: z.literal('sold'), seatId: z.string() }),
  z.object({ type: z.literal('lock_denied'), seatId: z.string(), reason: z.string() }),
]);
export type SeatLockEvent = z.infer<typeof SeatLockEvent>;

export const CreateBookingDraftRequest = z.object({
  showtimeId: z.string(),
  seatIds: z.array(z.string()).min(1).max(8),
  concessions: z
    .array(z.object({ itemId: z.string(), qty: z.number().int().min(1).max(10) }))
    .default([]),
  voucherCode: z.string().optional(),
});
export type CreateBookingDraftRequest = z.infer<typeof CreateBookingDraftRequest>;

export const Booking = z.object({
  id: z.string(),
  status: BookingStatus,
  showtimeId: z.string(),
  totalAmountVnd: z.number().int(),
  discountAmountVnd: z.number().int(),
  finalAmountVnd: z.number().int(),
  expiresAt: z.string(),
  qrToken: z.string().nullable(),
  createdAt: z.string(),
});
export type Booking = z.infer<typeof Booking>;
