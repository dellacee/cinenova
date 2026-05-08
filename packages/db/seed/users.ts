import bcrypt from 'bcrypt';

import type { PrismaClient } from '../src/index.js';

const FIXTURES = [
  {
    email: 'admin@cinenova.local',
    password: 'Admin123!',
    fullName: 'CineNova Admin',
    role: 'ADMIN' as const,
  },
  {
    email: 'staff@cinenova.local',
    password: 'Staff1234!',
    fullName: 'CineNova Staff',
    role: 'STAFF' as const,
  },
  {
    email: 'demo@cinenova.local',
    password: 'Demo1234!',
    fullName: 'Demo User',
    role: 'USER' as const,
  },
];

export async function seedUsers(prisma: PrismaClient) {
  for (const fx of FIXTURES) {
    const passwordHash = await bcrypt.hash(fx.password, 12);
    await prisma.user.upsert({
      where: { email: fx.email },
      update: {},
      create: {
        email: fx.email,
        fullName: fx.fullName,
        role: fx.role,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  }
  console.info(`  • users: ${FIXTURES.length} (admin/staff/demo)`);
}
