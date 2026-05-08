import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { MockPaymentAdapter } from './providers/mock.adapter.js';
import { VnpayAdapter } from './providers/vnpay.adapter.js';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, VnpayAdapter, MockPaymentAdapter],
  exports: [PaymentsService],
})
export class PaymentsModule {}
