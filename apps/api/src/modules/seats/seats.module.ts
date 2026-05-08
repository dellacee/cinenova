import { Module } from '@nestjs/common';

import { SeatLockService } from './seat-lock.service.js';
import { SeatsGateway } from './seats.gateway.js';

@Module({
  providers: [SeatLockService, SeatsGateway],
  exports: [SeatLockService, SeatsGateway],
})
export class SeatsModule {}
