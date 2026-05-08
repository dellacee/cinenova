import { z } from 'zod';

export const VoucherDiscountType = z.enum(['PERCENT', 'FIXED']);
export const VoucherScope = z.enum(['ALL', 'MOVIE', 'THEATER']);

export const Voucher = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  discountType: VoucherDiscountType,
  discountValue: z.number().int(),
  minSpendVnd: z.number().int(),
  maxDiscountVnd: z.number().int().nullable(),
  validFrom: z.string(),
  validTo: z.string(),
  maxUses: z.number().int(),
  usedCount: z.number().int(),
  scope: VoucherScope,
  isActive: z.boolean(),
});
export type Voucher = z.infer<typeof Voucher>;

export const CreateVoucherRequest = z.object({
  code: z.string().regex(/^[A-Z0-9_-]{3,32}$/),
  description: z.string().max(200).optional(),
  discountType: VoucherDiscountType,
  discountValue: z.number().int().min(1),
  minSpendVnd: z.number().int().min(0).default(0),
  maxDiscountVnd: z.number().int().min(0).optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  maxUses: z.number().int().min(1),
  scope: VoucherScope.default('ALL'),
  scopeRefId: z.string().optional(),
});
export type CreateVoucherRequest = z.infer<typeof CreateVoucherRequest>;
