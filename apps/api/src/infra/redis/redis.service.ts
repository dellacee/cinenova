import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
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
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.log('Redis connection established');
  }

  async onModuleDestroy() {
    await this.client.quit();
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
