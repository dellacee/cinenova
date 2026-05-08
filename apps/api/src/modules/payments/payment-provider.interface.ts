export interface BuildPaymentUrlInput {
  bookingId: string;
  amountVnd: number;
  orderInfo: string;
  ipAddress?: string;
  returnUrl: string;
}

export interface VerifyWebhookInput {
  query: Record<string, string>;
  body?: unknown;
}

export interface VerifyWebhookResult {
  isValid: boolean;
  bookingId?: string;
  amountVnd?: number;
  providerRef?: string;
  status: 'PAID' | 'FAILED';
  rawPayload: unknown;
}

export interface PaymentProvider {
  readonly name: 'VNPAY' | 'STRIPE' | 'MOCK';
  buildCheckoutUrl(input: BuildPaymentUrlInput): Promise<string>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
}
