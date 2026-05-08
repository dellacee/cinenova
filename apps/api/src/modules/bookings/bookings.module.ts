import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module.js';
import { SeatsModule } from '../seats/seats.module.js';
import { VouchersModule } from '../vouchers/vouchers.module.js';

import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [SeatsModule, VouchersModule, PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
