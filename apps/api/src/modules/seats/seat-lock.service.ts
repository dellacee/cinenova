import { Injectable } from '@nestjs/common';

import { RedisService } from '../../infra/redis/redis.service.js';

/**
 * Seat-lock primitives backed by Redis. Keys are scoped per showtime so we
 * can wipe an entire showtime's locks atomically (used when admin cancels).
 *
 * Key format: seat-lock:{showtimeId}:{seatId} -> userId
 * Default TTL: 300 seconds (5 minutes for seat selection)
 * Extended on draft creation to 600s (10 minutes for payment).
 */
@Injectable()
export class SeatLockService {
  private static readonly DEFAULT_TTL_SEC = 300;
  private static readonly EXTENDED_TTL_SEC = 600;

  constructor(private readonly redis: RedisService) {}

  private key(showtimeId: string, seatId: string) {
    return `seat-lock:${showtimeId}:${seatId}`;
  }

  /** Try to acquire a seat lock. Returns true on win, false if already held by someone else. */
  async lock(showtimeId: string, seatId: string, userId: string): Promise<boolean> {
    return this.redis.tryLock(this.key(showtimeId, seatId), userId, SeatLockService.DEFAULT_TTL_SEC);
  }

  async release(showtimeId: string, seatId: string, userId: string): Promise<boolean> {
    return this.redis.release(this.key(showtimeId, seatId), userId);
  }

  /** Extends TTL only if the caller still owns the lock. */
  async extend(showtimeId: string, seatId: string, userId: string): Promise<boolean> {
    return this.redis.extend(this.key(showtimeId, seatId), userId, SeatLockService.EXTENDED_TTL_SEC);
  }

  /** Holder of a given seat lock (or null if unlocked). */
  async holder(showtimeId: string, seatId: string): Promise<string | null> {
    return this.redis.client.get(this.key(showtimeId, seatId));
  }

  /** Snapshot all locked seats for a showtime: { seatId: userId }. */
  async snapshot(showtimeId: string): Promise<Record<string, string>> {
    const stream = this.redis.client.scanStream({
      match: `seat-lock:${showtimeId}:*`,
      count: 100,
    });

    const result: Record<string, string> = {};
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length === 0) continue;
      const values = await this.redis.client.mget(...keys);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = values[i];
        if (!k || !v) continue;
        const seatId = k.split(':')[2];
        if (seatId) result[seatId] = v;
      }
    }
    return result;
  }

  /** Verify the user owns ALL seats; returns the list of stale seatIds. */
  async verifyOwnership(showtimeId: string, seatIds: string[], userId: string): Promise<string[]> {
    if (seatIds.length === 0) return [];
    const keys = seatIds.map((id) => this.key(showtimeId, id));
    const holders = await this.redis.client.mget(...keys);
    const stale: string[] = [];
    for (let i = 0; i < seatIds.length; i++) {
      const seatId = seatIds[i];
      if (!seatId) continue;
      if (holders[i] !== userId) stale.push(seatId);
    }
    return stale;
  }

  /** Drop all seat locks for a showtime (used on payment success or admin cancel). */
  async releaseAll(showtimeId: string): Promise<void> {
    const stream = this.redis.client.scanStream({
      match: `seat-lock:${showtimeId}:*`,
      count: 100,
    });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) await this.redis.client.del(...keys);
    }
  }
}
