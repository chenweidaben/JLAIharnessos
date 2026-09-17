/**
 * 健澜科技杠OS - 内存缓存实现
 *
 * 单机、零依赖，用于开发、测试与 Redis 不可用时的降级。
 * 支持 TTL、容量上限 LRU 淘汰；原子操作在单线程事件循环内天然串行。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import type { CacheHealth, CacheValue, ICache } from './types.js';

interface Entry {
  value: CacheValue;
  expireAt: number | null; // epoch ms，null 表示永久
  lastAccess: number;
}

export interface MemoryCacheOptions {
  /** 最大键数量，超出按 LRU 淘汰，默认 10000 */
  maxEntries?: number;
}

export class MemoryCache implements ICache {
  readonly driver = 'memory' as const;
  private readonly store = new Map<string, Entry>();
  private readonly maxEntries: number;

  constructor(opts: MemoryCacheOptions = {}) {
    this.maxEntries = opts.maxEntries ?? 10_000;
  }

  private isExpired(e: Entry, now: number): boolean {
    return e.expireAt !== null && e.expireAt <= now;
  }

  private evictIfNeeded(): void {
    if (this.store.size < this.maxEntries) return;
    // 删除已过期键
    const now = Date.now();
    for (const [k, e] of this.store) {
      if (this.isExpired(e, now)) this.store.delete(k);
    }
    // 仍超容量则按最久未访问淘汰
    while (this.store.size >= this.maxEntries) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, e] of this.store) {
        if (e.lastAccess < oldestTime) {
          oldestTime = e.lastAccess;
          oldestKey = k;
        }
      }
      if (oldestKey === null) break;
      this.store.delete(oldestKey);
    }
  }

  async get<T = CacheValue>(key: string): Promise<T | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (this.isExpired(e, Date.now())) {
      this.store.delete(key);
      return null;
    }
    e.lastAccess = Date.now();
    return e.value as T;
  }

  async set<T = CacheValue>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.evictIfNeeded();
    this.store.set(key, {
      value: value as CacheValue,
      expireAt: ttlMs ? Date.now() + ttlMs : null,
      lastAccess: Date.now(),
    });
  }

  async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async expire(key: string, ttlMs: number): Promise<boolean> {
    const e = this.store.get(key);
    if (!e || this.isExpired(e, Date.now())) {
      if (e) this.store.delete(key);
      return false;
    }
    e.expireAt = Date.now() + ttlMs;
    return true;
  }

  async ttl(key: string): Promise<number> {
    const e = this.store.get(key);
    if (!e) return -2;
    if (e.expireAt === null) return -1;
    const remain = e.expireAt - Date.now();
    if (remain <= 0) {
      this.store.delete(key);
      return -2;
    }
    return remain;
  }

  async setNx(key: string, value: CacheValue, ttlMs: number): Promise<boolean> {
    const existing = this.store.get(key);
    if (existing && !this.isExpired(existing, Date.now())) return false;
    await this.set(key, value, ttlMs);
    return true;
  }

  async incrAndExpire(key: string, ttlMs: number, by = 1): Promise<number> {
    const now = Date.now();
    const e = this.store.get(key);
    let current = 0;
    if (e && !this.isExpired(e, now)) {
      current = typeof e.value === 'number' ? e.value : 0;
    }
    const next = current + by;
    this.store.set(key, {
      value: next,
      // 已存在且有过期时间则保持原过期；新建则设置窗口过期
      expireAt: e && !this.isExpired(e, now) && e.expireAt !== null ? e.expireAt : now + ttlMs,
      lastAccess: now,
    });
    return next;
  }

  async releaseIfValue(key: string, token: string): Promise<boolean> {
    const e = this.store.get(key);
    if (!e || this.isExpired(e, Date.now())) {
      if (e) this.store.delete(key);
      return false;
    }
    if (e.value !== token) return false;
    this.store.delete(key);
    return true;
  }

  async renewIfValue(key: string, token: string, ttlMs: number): Promise<boolean> {
    const e = this.store.get(key);
    if (!e || this.isExpired(e, Date.now()) || e.value !== token) return false;
    e.expireAt = Date.now() + ttlMs;
    return true;
  }

  async mget<T = CacheValue>(keys: string[]): Promise<Array<T | null>> {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
    );
    let count = 0;
    for (const k of [...this.store.keys()]) {
      if (regex.test(k)) {
        this.store.delete(k);
        count++;
      }
    }
    return count;
  }

  async ping(): Promise<CacheHealth> {
    return { ok: true, driver: 'memory', latencyMs: 0 };
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}
