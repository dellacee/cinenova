import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiProxyService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Mint a short-lived service-to-service token. The AI service is never
   * exposed publicly in production; this header is the only way the gateway
   * can talk to it.
   */
  private signServiceToken(): string {
    const secret = this.config.getOrThrow<string>('SERVICE_TOKEN_SECRET');
    const expires = Math.floor(Date.now() / 1000) + 5 * 60;
    const payload = `cinenova-api.${expires}`;
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}.${sig}`;
  }

  baseUrl(): string {
    return this.config.getOrThrow<string>('AI_SERVICE_URL').replace(/\/$/, '');
  }

  serviceHeaders(): Record<string, string> {
    return { 'x-service-token': this.signServiceToken() };
  }
}
