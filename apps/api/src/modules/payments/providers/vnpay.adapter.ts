import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  type BuildPaymentUrlInput,
  type PaymentProvider,
  type VerifyWebhookInput,
  type VerifyWebhookResult,
} from '../payment-provider.interface.js';

/**
 * VNPay sandbox adapter. Implements the documented signing scheme:
 *   1. Drop empty params, sort keys alphabetically.
 *   2. URL-encode + concat as query string.
 *   3. HMAC-SHA512 with hash secret.
 */
@Injectable()
export class VnpayAdapter implements PaymentProvider {
  readonly name = 'VNPAY' as const;

  constructor(private readonly config: ConfigService) {}

  async buildCheckoutUrl(input: BuildPaymentUrlInput): Promise<string> {
    const tmnCode = this.config.getOrThrow<string>('VNPAY_TMN_CODE');
    const hashSecret = this.config.getOrThrow<string>('VNPAY_HASH_SECRET');
    const baseUrl = this.config.getOrThrow<string>('VNPAY_URL');

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.bookingId,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(input.amountVnd * 100),
      vnp_ReturnUrl: input.returnUrl,
      vnp_IpAddr: input.ipAddress ?? '127.0.0.1',
      vnp_CreateDate: this.formatDate(new Date()),
    };

    const sorted = this.sortAndStringify(params);
    const signature = createHmac('sha512', hashSecret).update(sorted, 'utf-8').digest('hex');

    return `${baseUrl}?${sorted}&vnp_SecureHash=${signature}`;
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const hashSecret = this.config.getOrThrow<string>('VNPAY_HASH_SECRET');
    const { vnp_SecureHash, vnp_SecureHashType: _h, ...rest } = input.query;

    const expected = createHmac('sha512', hashSecret).update(this.sortAndStringify(rest), 'utf-8').digest('hex');
    const isValid = expected === vnp_SecureHash;

    const responseCode = rest.vnp_ResponseCode;
    return {
      isValid,
      bookingId: rest.vnp_TxnRef,
      amountVnd: rest.vnp_Amount ? Number(rest.vnp_Amount) / 100 : undefined,
      providerRef: rest.vnp_TransactionNo ?? rest.vnp_TxnRef,
      status: responseCode === '00' ? 'PAID' : 'FAILED',
      rawPayload: input.query,
    };
  }

  private sortAndStringify(params: Record<string, string>): string {
    return Object.keys(params)
      .filter((k) => params[k] != null && params[k] !== '')
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? '')}`)
      .join('&');
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    );
  }
}
