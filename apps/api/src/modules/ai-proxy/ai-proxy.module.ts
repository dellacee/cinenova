import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AiProxyController } from './ai-proxy.controller.js';
import { AiProxyService } from './ai-proxy.service.js';

@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'ai', ttl: 60_000, limit: 10 }])],
  controllers: [AiProxyController],
  providers: [AiProxyService],
})
export class AiProxyModule {}
