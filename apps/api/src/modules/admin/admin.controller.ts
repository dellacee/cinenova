import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller('admin')
@Roles('ADMIN', 'STAFF')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard() {
    const [movies, theaters, showtimes, users, bookings, revenue] = await Promise.all([
      this.prisma.movie.count({ where: { deletedAt: null } }),
      this.prisma.theater.count({ where: { deletedAt: null } }),
      this.prisma.showtime.count({ where: { isCancelled: false, startAt: { gte: new Date() } } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.booking.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { finalAmountVnd: true },
      }),
    ]);

    return {
      movies,
      theaters,
      upcomingShowtimes: showtimes,
      users,
      confirmedBookings: bookings,
      totalRevenueVnd: revenue._sum.finalAmountVnd ?? 0,
    };
  }

  @Get('audit')
  async audit(@Query('limit') limit = '50') {
    return this.prisma.auditLog.findMany({
      take: Math.min(Number(limit) || 50, 200),
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true, fullName: true, role: true } } },
    });
  }
}
