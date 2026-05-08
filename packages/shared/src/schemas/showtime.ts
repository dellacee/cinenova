import { z } from 'zod';

export const ShowtimeFormat = z.enum(['D2', 'D3', 'IMAX']);

export const Showtime = z.object({
  id: z.string(),
  movieId: z.string(),
  roomId: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  format: ShowtimeFormat,
  basePriceVnd: z.number().int(),
  isCancelled: z.boolean(),
});
export type Showtime = z.infer<typeof Showtime>;

export const ShowtimesQuery = z.object({
  movieId: z.string().optional(),
  theaterId: z.string().optional(),
  city: z.string().optional(),
  date: z.string().optional(),
  format: ShowtimeFormat.optional(),
});
export type ShowtimesQuery = z.infer<typeof ShowtimesQuery>;

export const CreateShowtimeRequest = z.object({
  movieId: z.string(),
  roomId: z.string(),
  startAt: z.string().datetime(),
  format: ShowtimeFormat.default('D2'),
  basePriceVnd: z.number().int().min(10_000).max(1_000_000),
});
export type CreateShowtimeRequest = z.infer<typeof CreateShowtimeRequest>;

export const UpdateShowtimeRequest = CreateShowtimeRequest.partial().extend({
  version: z.number().int(),
});
export type UpdateShowtimeRequest = z.infer<typeof UpdateShowtimeRequest>;
