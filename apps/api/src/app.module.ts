import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { ConfigModule } from './infra/config/config.module.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { QrModule } from './infra/qr/qr.module.js';
import { RedisModule } from './infra/redis/redis.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AiProxyModule } from './modules/ai-proxy/ai-proxy.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { ConcessionsModule } from './modules/concessions/concessions.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MoviesModule } from './modules/movies/movies.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { SeatsModule } from './modules/seats/seats.module.js';
import { ShowtimesModule } from './modules/showtimes/showtimes.module.js';
import { TheatersModule } from './modules/theaters/theaters.module.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    PrismaModule,
    RedisModule,
    QrModule,

    AuthModule,
    MoviesModule,
    TheatersModule,
    ShowtimesModule,
    SeatsModule,
    BookingsModule,
    PaymentsModule,
    ConcessionsModule,
    AdminModule,
    AiProxyModule,
    HealthModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
