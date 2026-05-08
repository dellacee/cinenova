import { Module } from '@nestjs/common';

import { MoviesModule } from '../movies/movies.module.js';
import { ShowtimesModule } from '../showtimes/showtimes.module.js';
import { TheatersModule } from '../theaters/theaters.module.js';

import { AdminController } from './admin.controller.js';

/**
 * Admin module composes existing modules' admin-scoped controllers.
 * Each entity owns its own AdminXController inside its module so that
 * service code stays close to its domain. This module just re-exports
 * shared admin endpoints (dashboard stats, audit log).
 */
@Module({
  imports: [MoviesModule, TheatersModule, ShowtimesModule],
  controllers: [AdminController],
})
export class AdminModule {}
