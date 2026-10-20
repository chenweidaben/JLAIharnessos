/**
 * 健澜科技 jlmedaios - 内存 LRU 缓存中间件
 *
 * 用于 BFF 聚合接口缓存，DEMO_MODE 下直接生效，生产可替换为 Redis。
 * 容量 100 条，默认 TTL 30 秒。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 100;

class LruCache {
  private store = new Map<string, CacheEntry>();

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // LRU：命中后移到末尾
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): void {
    if (this.store.size >= MAX_ENTRIES) {
      // 淘汰最旧的（第一个）
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const cache = new LruCache();

/**
 * 缓存包装器：对 GET 请求的 handler 结果做缓存
 * @param key 缓存键（通常用请求路径 + query）
 * @param ttlMs 过期时间（毫秒）
 * @param handler 原始处理函数
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  handler: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== null) {
    return cached as T;
  }
  const result = await handler();
  cache.set(key, result, ttlMs);
  return result;
}
