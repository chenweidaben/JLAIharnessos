/**
 * 健澜科技杠OS - 缓存工厂与服务装配
 *
 * 按 REDIS_URL 创建 Redis 缓存；连接不可用时降级为进程内内存缓存并告警，
 * 保证本地开发、CI 与故障场景下服务仍可启动（分布式语义在降级时退化为单机）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import type { ICache } from './types.js';
import Redis from 'ioredis';
import { MemoryCache } from './MemoryCache.js';
import { RedisCache } from './RedisCache.js';
import { DistributedLock } from './DistributedLock.js';
import { RateLimiter } from './RateLimiter.js';
import { SessionStore } from './SessionStore.js';
import { CacheAside } from './CacheAside.js';

export interface CreateCacheOptions {
  /** Redis 连接串；为空或 'memory' 时使用内存缓存 */
  redisUrl?: string;
  /** 强制内存模式 */
  memory?: boolean;
  /** 启动时探测超时（毫秒），默认 1500 */
  probeTimeoutMs?: number;
}

export interface CacheServices {
  cache: ICache;
  lock: DistributedLock;
  rateLimiter: RateLimiter;
  sessions: SessionStore;
  aside: CacheAside;
  /** 是否处于内存降级模式 */
  degraded: boolean;
}

function createRedisClient(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
    reconnectOnError: (err) => err.message.includes('READONLY'),
  });
}

export async function createCache(opts: CreateCacheOptions = {}): Promise<{ cache: ICache; degraded: boolean }> {
  const url = opts.redisUrl ?? process.env.REDIS_URL ?? '';
  if (opts.memory || !url || url === 'memory') {
    return { cache: new MemoryCache(), degraded: true };
  }

  const client = createRedisClient(url);
  const redis = new RedisCache(client);
  const timeout = opts.probeTimeoutMs ?? 1500;

  try {
    await client.connect();
    const health = await Promise.race([
      redis.ping(),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: 'probe timeout' }), timeout),
      ),
    ]);
    if (!health.ok) throw new Error(health.error ?? 'redis unhealthy');
    return { cache: redis, degraded: false };
  } catch (e) {
    console.warn('[cache] Redis 不可用，降级为内存缓存：', (e as Error).message);
    await redis.close().catch(() => undefined);
    return { cache: new MemoryCache(), degraded: true };
  }
}

/** 一键装配缓存相关全部服务 */
export async function createCacheServices(opts: CreateCacheOptions = {}): Promise<CacheServices> {
  const { cache, degraded } = await createCache(opts);
  return {
    cache,
    degraded,
    lock: new DistributedLock(cache),
    rateLimiter: new RateLimiter(cache),
    sessions: new SessionStore(cache),
    aside: new CacheAside(cache),
  };
}
