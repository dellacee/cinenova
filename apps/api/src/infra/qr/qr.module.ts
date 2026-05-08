import { Global, Module } from '@nestjs/common';

import { QrService } from './qr.service.js';

@Global()
@Module({
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
