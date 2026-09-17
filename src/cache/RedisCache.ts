/**
 * 健澜科技杠OS - Redis 缓存实现（ioredis）
 *
 * 值统一 JSON 序列化；锁释放/续期与"自增+首次过期"用 Lua 脚本保证原子性；
 * 模式删除使用 SCAN 游标，避免 KEYS 阻塞生产实例。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import type { Redis } from 'ioredis';
import type { CacheHealth, CacheValue, ICache } from './types.js';

// 仅当值等于 token 时删除（安全释放锁）
const RELEASE_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end`;

// 仅当值等于 token 时续期（看门狗）
const RENEW_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('pexpire', KEYS[1], ARGV[2])
  else
    return 0
  end`;

// 自增；仅在键首次创建（脚本执行前不存在）时设置过期，保证固定窗口边界原子
const INCR_EXPIRE_SCRIPT = `
  local exists = redis.call('exists', KEYS[1])
  local count = redis.call('incrby', KEYS[1], ARGV[2])
  if exists == 0 then
    redis.call('pexpire', KEYS[1], ARGV[1])
  end
  return count`;

export class RedisCache implements ICache {
  readonly driver = 'redis' as const;

  constructor(private readonly client: Redis) {}

  async get<T = CacheValue>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null || raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // 非本系统写入的裸字符串，原样返回
      return raw as unknown as T;
    }
  }

  async set<T = CacheValue>(key: string, value: T, ttlMs?: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (ttlMs && ttlMs > 0) {
      await this.client.set(key, raw, 'PX', ttlMs);
    } else {
      await this.client.set(key, raw);
    }
  }

  async del(key: string): Promise<boolean> {
    return (await this.client.del(key)) > 0;
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) > 0;
  }

  async expire(key: string, ttlMs: number): Promise<boolean> {
    return (await this.client.pexpire(key, ttlMs)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.pttl(key);
  }

  async setNx(key: string, value: CacheValue, ttlMs: number): Promise<boolean> {
    const res = await this.client.set(key, JSON.stringify(value), 'PX', ttlMs, 'NX');
    return res === 'OK';
  }

  async incrAndExpire(key: string, ttlMs: number, by = 1): Promise<number> {
    const res = await this.client.eval(INCR_EXPIRE_SCRIPT, 1, key, String(ttlMs), String(by));
    return Number(res);
  }

  async releaseIfValue(key: string, token: string): Promise<boolean> {
    // 存储侧为 JSON.stringify(token)，故比较时同样序列化，保持两侧一致
    const res = await this.client.eval(RELEASE_SCRIPT, 1, key, JSON.stringify(token));
    return Number(res) === 1;
  }

  async renewIfValue(key: string, token: string, ttlMs: number): Promise<boolean> {
    const res = await this.client.eval(RENEW_SCRIPT, 1, key, JSON.stringify(token), String(ttlMs));
    return Number(res) === 1;
  }

  async mget<T = CacheValue>(keys: string[]): Promise<Array<T | null>> {
    if (keys.length === 0) return [];
    const raws = await this.client.mget(...keys);
    return raws.map((r) => {
      if (r === null || r === undefined) return null;
      try {
        return JSON.parse(r) as T;
      } catch {
        return r as unknown as T;
      }
    });
  }

  async deletePattern(pattern: string): Promise<number> {
    // SCAN 游标遍历，UNLINK 异步释放，避免阻塞
    let cursor = '0';
    let total = 0;
    do {
      const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) total += await this.client.unlink(...keys);
    } while (cursor !== '0');
    return total;
  }

  async ping(): Promise<CacheHealth> {
    const start = Date.now();
    try {
      const pong = await this.client.ping();
      return { ok: pong === 'PONG', driver: 'redis', latencyMs: Date.now() - start };
    } catch (e) {
      return { ok: false, driver: 'redis', latencyMs: Date.now() - start, error: (e as Error).message };
    }
  }

  async close(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
