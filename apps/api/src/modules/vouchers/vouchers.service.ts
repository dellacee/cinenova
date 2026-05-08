import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface VoucherEvaluation {
  voucherId: string;
  code: string;
  discountAppliedVnd: number;
}

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate a voucher inside a transaction. Locks the voucher row FOR UPDATE
   * to prevent over-redemption under race. Throws BadRequestException if the
   * voucher is invalid for any reason.
   *
   * Caller is responsible for incrementing usedCount when the booking
   * eventually transitions to CONFIRMED.
   */
  async evaluate(
    code: string,
    subtotalVnd: number,
    tx: { $queryRaw: PrismaService['$queryRaw']; voucher: PrismaService['voucher'] },
  ): Promise<VoucherEvaluation> {
    // Postgres FOR UPDATE row lock — Prisma doesn't expose locking modes,
    // so we use $queryRaw to fetch + lock, then reuse the row through tx.voucher.
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM vouchers
      WHERE code = ${code}
        AND is_active = TRUE
        AND valid_from <= NOW() AND valid_to >= NOW()
        AND used_count < max_uses
      FOR UPDATE
    `;
    const lockedId = rows[0]?.id;
    if (!lockedId) throw new BadRequestException('Voucher invalid or expired');

    const voucher = await tx.voucher.findUniqueOrThrow({ where: { id: lockedId } });
    if (subtotalVnd < voucher.minSpendVnd) {
      throw new BadRequestException(`Voucher requires minimum spend of ${voucher.minSpendVnd} VND`);
    }

    let discount =
      voucher.discountType === 'PERCENT'
        ? Math.floor((subtotalVnd * voucher.discountValue) / 100)
        : voucher.discountValue;

    if (voucher.maxDiscountVnd && discount > voucher.maxDiscountVnd) {
      discount = voucher.maxDiscountVnd;
    }
    if (discount > subtotalVnd) discount = subtotalVnd;

    return { voucherId: voucher.id, code: voucher.code, discountAppliedVnd: discount };
  }

  /** Increment used count after CONFIRMED. Must be called within the same tx. */
  async incrementUsage(voucherId: string, tx: { voucher: PrismaService['voucher'] }) {
    await tx.voucher.update({ where: { id: voucherId }, data: { usedCount: { increment: 1 } } });
  }
}
