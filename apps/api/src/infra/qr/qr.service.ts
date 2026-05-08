import { createHmac } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';

@Injectable()
export class QrService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Mints a signed token { bookingId, exp, sig } and renders it as a base64 QR data URL.
   * Token is valid for 4 hours (long enough for the showtime + buffer).
   */
  async mintTicketQr(bookingId: string): Promise<{ token: string; qrDataUrl: string }> {
    const secret = this.config.getOrThrow<string>('QR_TOKEN_SECRET');
    const exp = Math.floor(Date.now() / 1000) + 4 * 3600;
    const payload = `${bookingId}.${exp}`;
    const sig = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32);
    const token = `${payload}.${sig}`;
    const qrDataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });
    return { token, qrDataUrl };
  }

  verifyTicketQr(token: string): { valid: boolean; bookingId?: string } {
    const secret = this.config.getOrThrow<string>('QR_TOKEN_SECRET');
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };
    const [bookingId, expStr, sig] = parts;
    if (!bookingId || !expStr || !sig) return { valid: false };

    const exp = Number(expStr);
    if (!exp || exp < Math.floor(Date.now() / 1000)) return { valid: false };

    const expected = createHmac('sha256', secret).update(`${bookingId}.${exp}`).digest('hex').slice(0, 32);
    if (expected !== sig) return { valid: false };

    return { valid: true, bookingId };
  }
}
