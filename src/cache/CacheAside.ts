/**
 * 健澜科技杠OS - 缓存旁路（Cache-Aside）
 *
 * read-through 封装，并针对三类经典缓存问题做防护：
 *   - 击穿：热点 key 失效瞬间，singleflight 让并发请求只回源一次；
 *   - 穿透：查询不存在的数据，缓存短 TTL 空值占位；
 *   - 雪崩：TTL 叠加随机抖动，避免大批 key 同时过期。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import type { ICache } from './types.js';
import { cacheKey } from './types.js';

const NULL_PLACEHOLDER = '__CACHE_NULL__';

export interface CacheAsideOptions<T> {
  /** 基础 TTL（毫秒） */
  ttlMs: number;
  /** TTL 随机抖动比例（0~1），默认 0.1，用于防雪崩 */
  jitterRatio?: number;
  /** 空值 TTL（毫秒），默认 ttl 的 1/10，用于防穿透；设 0 则不缓存空值 */
  nullTtlMs?: number;
  /** 判定结果是否为"空"（默认 null/undefined） */
  isNull?: (v: T) => boolean;
  /** 强制跳过缓存回源 */
  forceRefresh?: boolean;
}

export class CacheAside {
  /** 进程内进行中的回源请求，防热点击穿（多实例场景由分布式锁进一步保护） */
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly cache: ICache) {}

  private jitteredTtl(base: number, ratio: number): number {
    if (ratio <= 0) return base;
    const delta = base * ratio;
    return Math.round(base + (Math.random() * 2 - 1) * delta);
  }

  async getOrFetch<T>(
    domain: string,
    identity: string | number,
    loader: () => Promise<T>,
    opts: CacheAsideOptions<T>,
  ): Promise<T> {
    const key = cacheKey(domain, identity);
    const jitterRatio = opts.jitterRatio ?? 0.1;
    const nullTtl = opts.nullTtlMs ?? Math.max(1000, Math.floor(opts.ttlMs / 10));
    const isNull = opts.isNull ?? ((v: T) => v === null || v === undefined);

    if (!opts.forceRefresh) {
      const cached = await this.cache.get<T | typeof NULL_PLACEHOLDER>(key);
      if (cached === NULL_PLACEHOLDER) return null as T;
      if (cached !== null && cached !== undefined) return cached as T;

      // singleflight：合并并发回源
      const existing = this.inflight.get(key) as Promise<T> | undefined;
      if (existing) return existing;
    }

    const loadPromise = (async (): Promise<T> => {
      try {
        const value = await loader();
        if (isNull(value)) {
          if (nullTtl > 0) await this.cache.set(key, NULL_PLACEHOLDER, this.jitteredTtl(nullTtl, jitterRatio));
          return value;
        }
        await this.cache.set(key, value as unknown as Record<string, unknown>, this.jitteredTtl(opts.ttlMs, jitterRatio));
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, loadPromise as Promise<unknown>);
    return loadPromise;
  }

  /** 主动失效 */
  async invalidate(domain: string, identity: string | number): Promise<void> {
    await this.cache.del(cacheKey(domain, identity));
  }
}
