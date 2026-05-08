import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
// NestJS DI relies on runtime metadata reflection — ConfigService MUST be a
// regular value import (not `import type`), otherwise tsc erases it and the
// container can't resolve the constructor parameter.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  /**
   * Best-effort eager connect at boot. We swallow failures so the HTTP server
   * still binds and Render's liveness probe can succeed even if Redis is
   * temporarily unreachable. ioredis will reconnect lazily on the first
   * command after the connection comes back.
   */
  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Redis connection established');
    } catch (err) {
      this.logger.error(
        'Redis eager connect failed; continuing — operations will retry',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {
      // Already disconnected — ignore.
    }
  }

  /** Atomic SETNX with TTL — used for seat-locks. Returns true on win. */
  async tryLock(key: string, value: string, ttlSec: number): Promise<boolean> {
    const res = await this.client.set(key, value, 'EX', ttlSec, 'NX');
    return res === 'OK';
  }

  async release(key: string, expectedValue: string): Promise<boolean> {
    const lua = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    const result = (await this.client.eval(lua, 1, key, expectedValue)) as number;
    return result === 1;
  }

  async extend(key: string, expectedValue: string, ttlSec: number): Promise<boolean> {
    const lua = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('expire', KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = (await this.client.eval(lua, 1, key, expectedValue, String(ttlSec))) as number;
    return result === 1;
  }
}
