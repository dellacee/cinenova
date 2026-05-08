import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { BookingsService } from '../modules/bookings/bookings.service.js';

/**
 * Cron-style sweeper. Runs every minute. Self-scheduling so we don't need
 * an extra dependency just for cron syntax.
 */
@Injectable()
export class ExpireBookingsJob implements OnModuleInit {
  private readonly logger = new Logger(ExpireBookingsJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly bookings: BookingsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
  }

  async tick() {
    try {
      const expired = await this.bookings.expireOverdue();
      if (expired > 0) this.logger.log(`expired ${expired} overdue bookings`);
    } catch (err) {
      this.logger.error('expire-bookings tick failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
