import { Module } from '@nestjs/common';

import { AdminTheatersController, TheatersController } from './theaters.controller.js';
import { TheatersService } from './theaters.service.js';

@Module({
  controllers: [TheatersController, AdminTheatersController],
  providers: [TheatersService],
  exports: [TheatersService],
})
export class TheatersModule {}
