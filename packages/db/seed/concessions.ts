import type { PrismaClient } from '../src/index.js';

const ITEMS = [
  { name: 'Combo Đôi', type: 'COMBO', priceVnd: 99_000, description: '2 nước + 1 bắp lớn' },
  { name: 'Combo Solo', type: 'COMBO', priceVnd: 69_000, description: '1 nước + 1 bắp vừa' },
  { name: 'Combo Family', type: 'COMBO', priceVnd: 159_000, description: '4 nước + 2 bắp lớn' },
  { name: 'Bắp rang bơ lớn', type: 'POPCORN', priceVnd: 55_000 },
  { name: 'Bắp rang bơ vừa', type: 'POPCORN', priceVnd: 45_000 },
  { name: 'Bắp caramel', type: 'POPCORN', priceVnd: 65_000 },
  { name: 'Bắp phô mai', type: 'POPCORN', priceVnd: 65_000 },
  { name: 'Coca-Cola lớn', type: 'DRINK', priceVnd: 35_000 },
  { name: 'Coca-Cola vừa', type: 'DRINK', priceVnd: 25_000 },
  { name: 'Sprite lớn', type: 'DRINK', priceVnd: 35_000 },
  { name: 'Nước suối', type: 'DRINK', priceVnd: 15_000 },
  { name: 'Trà đào', type: 'DRINK', priceVnd: 30_000 },
  { name: 'Cà phê đá', type: 'DRINK', priceVnd: 30_000 },
  { name: 'Hot dog', type: 'SNACK', priceVnd: 45_000 },
  { name: 'Khoai tây chiên', type: 'SNACK', priceVnd: 40_000 },
  { name: 'Nachos phô mai', type: 'SNACK', priceVnd: 60_000 },
  { name: 'Mực rim cay', type: 'SNACK', priceVnd: 50_000 },
  { name: 'Combo Couple', type: 'COMBO', priceVnd: 119_000, description: '2 nước + bắp lớn + 1 snack' },
  { name: 'Combo Date Night', type: 'COMBO', priceVnd: 139_000, description: '2 nước cao cấp + bắp caramel' },
  { name: 'Soda dâu', type: 'DRINK', priceVnd: 35_000 },
] as const;

export async function seedConcessions(prisma: PrismaClient) {
  for (const item of ITEMS) {
    await prisma.concessionItem.upsert({
      where: { id: item.name },
      update: { priceVnd: item.priceVnd },
      create: {
        id: item.name,
        name: item.name,
        type: item.type,
        priceVnd: item.priceVnd,
        description: 'description' in item ? item.description : null,
      },
    });
  }
  console.info(`  • concessions: ${ITEMS.length}`);
}
