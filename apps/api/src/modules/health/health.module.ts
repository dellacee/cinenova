import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { RedisService } from '../../infra/redis/redis.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('liveness')
  liveness() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Public()
  @Get('readiness')
  async readiness() {
    const [db, cache] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.client.ping(),
    ]);
    return {
      status: db.status === 'fulfilled' && cache.status === 'fulfilled' ? 'ok' : 'degraded',
      checks: {
        postgres: db.status === 'fulfilled',
        redis: cache.status === 'fulfilled',
      },
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
