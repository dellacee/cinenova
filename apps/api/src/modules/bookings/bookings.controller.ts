import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateBookingDraftRequest } from '@cinenova/shared';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { parseWith } from '../../common/pipes/zod-validation.pipe.js';
import { PaymentsService } from '../payments/payments.service.js';

import { BookingsService } from './bookings.service.js';

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
  ) {}

  @Post('draft')
  @HttpCode(HttpStatus.CREATED)
  draft(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.bookings.createDraft(user.sub, parseWith(CreateBookingDraftRequest, body));
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.bookings.listMine(user.sub);
  }

  @Get(':id')
  byId(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookings.getMine(user.sub, id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookings.cancel(user.sub, id);
  }

  @Public()
  @Get('webhook/:provider/return')
  async webhookReturn(@Param('provider') provider: string, @Query() query: Record<string, string>) {
    const result = await this.payments.verify(provider, { query });
    if (!result.isValid || !result.bookingId) return { ok: false, reason: 'invalid' };
    if (result.status === 'PAID') {
      await this.bookings.confirm(result.bookingId, {
        provider: provider.toUpperCase() as 'VNPAY' | 'STRIPE' | 'MOCK',
        providerRef: result.providerRef ?? `${provider}-${Date.now()}`,
        amountVnd: result.amountVnd ?? 0,
        rawPayload: result.rawPayload,
      });
      return { ok: true, status: 'CONFIRMED' };
    }
    await this.bookings.fail(result.bookingId, result.rawPayload);
    return { ok: true, status: 'FAILED' };
  }

  @Public()
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async webhookPost(
    @Param('provider') provider: string,
    @Query() query: Record<string, string>,
    @Body() body: unknown,
  ) {
    const result = await this.payments.verify(provider, { query, body });
    if (!result.isValid || !result.bookingId) return { ok: false };
    if (result.status === 'PAID') {
      await this.bookings.confirm(result.bookingId, {
        provider: provider.toUpperCase() as 'VNPAY' | 'STRIPE' | 'MOCK',
        providerRef: result.providerRef ?? `${provider}-${Date.now()}`,
        amountVnd: result.amountVnd ?? 0,
        rawPayload: result.rawPayload,
      });
    } else {
      await this.bookings.fail(result.bookingId, result.rawPayload);
    }
    return { ok: true };
  }
}
