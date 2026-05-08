import { Injectable, NotFoundException } from '@nestjs/common';

import { type CreateTheaterRequest, type UpdateTheaterRequest } from '@cinenova/shared';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class TheatersService {
  constructor(private readonly prisma: PrismaService) {}

  list(city?: string) {
    return this.prisma.theater.findMany({
      where: { deletedAt: null, isActive: true, ...(city ? { city } : {}) },
      include: { rooms: { where: { deletedAt: null } } },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
  }

  async getBySlug(slug: string) {
    const theater = await this.prisma.theater.findFirst({
      where: { slug, deletedAt: null },
      include: {
        rooms: {
          where: { deletedAt: null },
          include: { seats: { orderBy: [{ row: 'asc' }, { col: 'asc' }] } },
        },
      },
    });
    if (!theater) throw new NotFoundException(`Theater '${slug}' not found`);
    return theater;
  }

  async create(input: CreateTheaterRequest) {
    return this.prisma.theater.create({ data: input });
  }

  async update(id: string, input: UpdateTheaterRequest) {
    const existing = await this.prisma.theater.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException(`Theater '${id}' not found`);
    return this.prisma.theater.update({ where: { id }, data: input });
  }

  async softDelete(id: string) {
    const existing = await this.prisma.theater.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException(`Theater '${id}' not found`);
    await this.prisma.theater.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }

  async listCities() {
    const rows = await this.prisma.theater.findMany({
      where: { deletedAt: null, isActive: true },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });
    return rows.map((r) => r.city);
  }
}
