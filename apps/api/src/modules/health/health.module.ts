import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../../common/decorators/public.decorator.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { RedisService } from '../../infra/redis/redis.service.js';

// Render's free-tier health-check pings these endpoints frequently. Skip
// rate-limiting on the whole controller so a healthy probe never burns
// the global throttler budget and trips a 429 → restart loop.
@SkipThrottle()
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
