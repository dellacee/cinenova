import { Module } from '@nestjs/common';

import { AiProxyController } from './ai-proxy.controller.js';
import { AiProxyService } from './ai-proxy.service.js';

// Throttler is configured globally in AppModule (default + ai named throttlers).
// We deliberately do NOT call ThrottlerModule.forRoot() here — registering it
// twice causes the `ai` throttler to apply to every route in the app, which
// 429s Render's health-check pings on /api/health/liveness and triggers a
// restart loop.
@Module({
  controllers: [AiProxyController],
  providers: [AiProxyService],
})
export class AiProxyModule {}
