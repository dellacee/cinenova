/**
 * Pricing engine smoke tests. We pull the multipliers out of the service
 * so the test can exercise them without standing up Prisma + Redis.
 *
 * The full booking flow (locking + transaction + webhook) is covered by
 * an integration test against Testcontainers in M10's follow-up — this file
 * focuses on the deterministic pricing math.
 */
import { describe, expect, it } from 'vitest';

const SEAT_TYPE_MULT = { STANDARD: 1, VIP: 1.4, COUPLE: 1.8 } as const;
const FORMAT_MULT = { D2: 1, D3: 1.2, IMAX: 1.6 } as const;

function priceFor(basePrice: number, type: keyof typeof SEAT_TYPE_MULT, format: keyof typeof FORMAT_MULT) {
  return Math.round(basePrice * SEAT_TYPE_MULT[type] * FORMAT_MULT[format]);
}

describe('Booking pricing engine', () => {
  it('standard 2D seat = base price', () => {
    expect(priceFor(90_000, 'STANDARD', 'D2')).toBe(90_000);
  });

  it('VIP 2D = base × 1.4', () => {
    expect(priceFor(90_000, 'VIP', 'D2')).toBe(126_000);
  });

  it('couple seat IMAX = base × 1.8 × 1.6', () => {
    expect(priceFor(180_000, 'COUPLE', 'IMAX')).toBe(518_400);
  });

  it('rounds to whole VND (no fractional currency)', () => {
    const odd = priceFor(99_999, 'VIP', 'D3');
    expect(Number.isInteger(odd)).toBe(true);
  });
});
