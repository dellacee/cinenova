import { Controller, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type Request } from 'express';

import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Issue a checkout URL for an existing PENDING booking.
   * Webhook handling lives in BookingsController to avoid a cycle.
   */
  @Post(':bookingId/checkout')
  async checkout(@Param('bookingId') bookingId: string, @Req() req: Request) {
    const url = await this.payments.startCheckout(bookingId, req.ip);
    return { url };
  }
}
