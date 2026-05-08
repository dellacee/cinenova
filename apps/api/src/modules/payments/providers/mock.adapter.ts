import { randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  type BuildPaymentUrlInput,
  type PaymentProvider,
  type VerifyWebhookInput,
  type VerifyWebhookResult,
} from '../payment-provider.interface.js';

/**
 * Mock adapter for local development. Issues a "checkout URL" that points
 * back to a confirmation endpoint with a signed payload.
 */
@Injectable()
export class MockPaymentAdapter implements PaymentProvider {
  readonly name = 'MOCK' as const;

  constructor(private readonly config: ConfigService) {}

  async buildCheckoutUrl(input: BuildPaymentUrlInput): Promise<string> {
    const ref = `mock-${randomBytes(8).toString('hex')}`;
    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    return `${appUrl}/booking/return?bookingId=${input.bookingId}&providerRef=${ref}&amount=${input.amountVnd}&status=PAID`;
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    return {
      isValid: true,
      bookingId: input.query.bookingId,
      amountVnd: Number(input.query.amount ?? 0),
      providerRef: input.query.providerRef ?? `mock-${Date.now()}`,
      status: input.query.status === 'PAID' ? 'PAID' : 'FAILED',
      rawPayload: input.query,
    };
  }
}
