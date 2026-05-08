import type { PrismaClient } from '../src/index.js';

const NOW = new Date();
const IN_30_DAYS = new Date(NOW.getTime() + 30 * 86_400_000);
const IN_90_DAYS = new Date(NOW.getTime() + 90 * 86_400_000);

const VOUCHERS = [
  { code: 'WELCOME10', description: 'Giảm 10% cho lần đầu', discountType: 'PERCENT', discountValue: 10, maxUses: 1000, validTo: IN_90_DAYS },
  { code: 'SUMMER25', description: 'Giảm 25% mùa hè', discountType: 'PERCENT', discountValue: 25, maxUses: 500, validTo: IN_30_DAYS, maxDiscountVnd: 50_000 },
  { code: 'SAVE50K', description: 'Giảm 50.000đ cho đơn từ 200k', discountType: 'FIXED', discountValue: 50_000, minSpendVnd: 200_000, maxUses: 200, validTo: IN_30_DAYS },
  { code: 'WEEKEND15', description: 'Giảm 15% cuối tuần', discountType: 'PERCENT', discountValue: 15, maxUses: 1000, validTo: IN_90_DAYS, maxDiscountVnd: 30_000 },
  { code: 'IMAX100', description: 'Giảm 100k cho IMAX', discountType: 'FIXED', discountValue: 100_000, minSpendVnd: 300_000, maxUses: 100, validTo: IN_30_DAYS },
  { code: 'STUDENT20', description: 'Sinh viên giảm 20%', discountType: 'PERCENT', discountValue: 20, maxUses: 5000, validTo: IN_90_DAYS, maxDiscountVnd: 40_000 },
  { code: 'FAMILY30', description: 'Combo gia đình giảm 30k', discountType: 'FIXED', discountValue: 30_000, maxUses: 500, validTo: IN_30_DAYS },
  { code: 'NIGHTOWL', description: 'Suất sau 21h giảm 20%', discountType: 'PERCENT', discountValue: 20, maxUses: 800, validTo: IN_90_DAYS },
  { code: 'BIRTHDAY', description: 'Ưu đãi sinh nhật 25%', discountType: 'PERCENT', discountValue: 25, maxUses: 5000, validTo: IN_90_DAYS, maxDiscountVnd: 80_000 },
  { code: 'FIRST5', description: 'Tặng 5% giao dịch đầu tiên', discountType: 'PERCENT', discountValue: 5, maxUses: 10_000, validTo: IN_90_DAYS },
] as const;

export async function seedVouchers(prisma: PrismaClient) {
  for (const v of VOUCHERS) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {},
      create: {
        code: v.code,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minSpendVnd: 'minSpendVnd' in v ? v.minSpendVnd : 0,
        maxDiscountVnd: 'maxDiscountVnd' in v ? v.maxDiscountVnd : null,
        validFrom: NOW,
        validTo: v.validTo,
        maxUses: v.maxUses,
        scope: 'ALL',
      },
    });
  }
  console.info(`  • vouchers: ${VOUCHERS.length}`);
}
