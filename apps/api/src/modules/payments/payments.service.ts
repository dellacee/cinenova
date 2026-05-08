import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

import {
  type PaymentProvider,
  type VerifyWebhookInput,
  type VerifyWebhookResult,
} from './payment-provider.interface.js';
import { MockPaymentAdapter } from './providers/mock.adapter.js';
import { VnpayAdapter } from './providers/vnpay.adapter.js';

@Injectable()
export class PaymentsService {
  private readonly providers: Record<string, PaymentProvider>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    vnpay: VnpayAdapter,
    mock: MockPaymentAdapter,
  ) {
    this.providers = { vnpay, mock };
  }

  resolveProvider(name?: string): PaymentProvider {
    const key = (name ?? this.config.get<string>('PAYMENT_PROVIDER') ?? 'mock').toLowerCase();
    const provider = this.providers[key];
    if (!provider) throw new Error(`Unknown payment provider: ${name}`);
    return provider;
  }

  async startCheckout(bookingId: string, ipAddress?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException(`Booking '${bookingId}' not found`);
    if (booking.status !== 'PENDING') throw new Error(`Booking is in status ${booking.status}`);

    const provider = this.resolveProvider();
    const returnUrl =
      this.config.get<string>('VNPAY_RETURN_URL') ??
      `${this.config.get<string>('NEXT_PUBLIC_APP_URL')}/booking/return`;

    return provider.buildCheckoutUrl({
      bookingId: booking.id,
      amountVnd: booking.finalAmountVnd,
      orderInfo: `CineNova booking ${booking.id}`,
      ipAddress,
      returnUrl,
    });
  }

  async verify(provider: string, input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    return this.resolveProvider(provider).verifyWebhook(input);
  }
}
