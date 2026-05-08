import { Module } from '@nestjs/common';

import { BookingsModule } from '../modules/bookings/bookings.module.js';

import { ExpireBookingsJob } from './expire-bookings.job.js';

@Module({
  imports: [BookingsModule],
  providers: [ExpireBookingsJob],
})
export class JobsModule {}
