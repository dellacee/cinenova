import { Module } from '@nestjs/common';

import { VouchersService } from './vouchers.service.js';

@Module({
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
