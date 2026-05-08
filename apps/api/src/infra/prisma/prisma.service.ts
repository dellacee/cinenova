import { PrismaClient } from '@cinenova/db';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  /**
   * Best-effort eager connect at boot. We swallow failures here so the HTTP
   * server still binds and Render's liveness probe can succeed even if the
   * database is briefly unreachable (Neon scale-to-zero cold start, transient
   * network issue, etc.). Subsequent queries will reconnect on demand.
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Postgres connection established');
    } catch (err) {
      this.logger.error(
        'Postgres eager connect failed; continuing — queries will retry',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // Already disconnected — ignore.
    }
  }
}
