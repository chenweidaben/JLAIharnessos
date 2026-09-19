/**
 * 健澜科技杠OS - 缓存层统一出口
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

export type {
  ICache,
  CacheValue,
  CacheHealth,
} from './types.js';
export { cacheKey } from './types.js';

export { MemoryCache } from './MemoryCache.js';
export type { MemoryCacheOptions } from './MemoryCache.js';
export { RedisCache } from './RedisCache.js';

export { DistributedLock, LockAcquireError } from './DistributedLock.js';
export type { AcquireOptions, LockLease, WithLockOptions } from './DistributedLock.js';

export { RateLimiter } from './RateLimiter.js';
export type { RateLimitResult, RateLimitRule, TokenBucketRule } from './RateLimiter.js';

export { SessionStore } from './SessionStore.js';
export type { SessionPayload } from './SessionStore.js';

export { CacheAside } from './CacheAside.js';
export type { CacheAsideOptions } from './CacheAside.js';

export { createCache, createCacheServices } from './factory.js';
export type { CreateCacheOptions, CacheServices } from './factory.js';
