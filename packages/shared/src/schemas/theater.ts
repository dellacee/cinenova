import { z } from 'zod';

export const SeatType = z.enum(['STANDARD', 'VIP', 'COUPLE']);

export const RoomLayout = z.object({
  rows: z.array(z.string()),
  cols: z.number().int(),
  aisleCols: z.array(z.number().int()).default([]),
  vipRows: z.array(z.string()).default([]),
  coupleRows: z.array(z.string()).default([]),
});
export type RoomLayout = z.infer<typeof RoomLayout>;

export const Theater = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  addressLine: z.string(),
  imageUrl: z.string().nullable(),
});
export type Theater = z.infer<typeof Theater>;

export const ScreeningRoom = z.object({
  id: z.string(),
  theaterId: z.string(),
  name: z.string(),
  rowsCount: z.number().int(),
  colsCount: z.number().int(),
  layoutJson: RoomLayout,
});
export type ScreeningRoom = z.infer<typeof ScreeningRoom>;

export const CreateTheaterRequest = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).max(80),
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  district: z.string().max(80).optional(),
  addressLine: z.string().min(1).max(200),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().max(20).optional(),
  imageUrl: z.string().url().optional(),
});
export type CreateTheaterRequest = z.infer<typeof CreateTheaterRequest>;

export const UpdateTheaterRequest = CreateTheaterRequest.partial();
export type UpdateTheaterRequest = z.infer<typeof UpdateTheaterRequest>;
