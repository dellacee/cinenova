import { Module } from '@nestjs/common';

import { AdminShowtimesController, ShowtimesController } from './showtimes.controller.js';
import { ShowtimesService } from './showtimes.service.js';

@Module({
  controllers: [ShowtimesController, AdminShowtimesController],
  providers: [ShowtimesService],
  exports: [ShowtimesService],
})
export class ShowtimesModule {}
