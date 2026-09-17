/**
 * 健澜科技杠OS - 分布式锁
 *
 * 基于 ICache 的 SET-NX-PX 互斥 + token 安全释放，支持：
 *   - 自旋获取（带退避与超时）
 *   - 看门狗自动续期，防止业务未执行完锁先过期
 *   - withLock 模板，异常也保证释放
 *
 * 典型用途：同一患者病历串行编辑、处方审核防并发、定时任务单实例执行。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { randomUUID } from 'node:crypto';
import type { ICache } from './types.js';
import { cacheKey } from './types.js';

export interface AcquireOptions {
  /** 锁 TTL（毫秒），默认 30s */
  ttlMs?: number;
  /** 最长等待获取时间（毫秒），默认 5000；0 表示只尝试一次 */
  waitTimeoutMs?: number;
  /** 重试间隔（毫秒），默认 100 */
  retryIntervalMs?: number;
}

export interface LockLease {
  key: string;
  token: string;
  acquiredAt: number;
}

export interface WithLockOptions extends AcquireOptions {
  /** 看门狗续期间隔（毫秒），默认 ttl/3；设 0 关闭续期 */
  watchdogIntervalMs?: number;
}

export class LockAcquireError extends Error {
  constructor(public readonly key: string) {
    super(`获取分布式锁超时：${key}`);
    this.name = 'LockAcquireError';
  }
}

export class DistributedLock {
  constructor(private readonly cache: ICache) {}

  /** 尝试获取一次，失败返回 null */
  async tryAcquire(key: string, ttlMs = 30_000): Promise<LockLease | null> {
    const fullKey = key.startsWith('jianlan:lock:') ? key : cacheKey('lock', key);
    const token = randomUUID();
    const ok = await this.cache.setNx(fullKey, token, ttlMs);
    if (!ok) return null;
    return { key: fullKey, token, acquiredAt: Date.now() };
  }

  /** 自旋获取，超时抛 LockAcquireError */
  async acquire(key: string, opts: AcquireOptions = {}): Promise<LockLease> {
    const ttlMs = opts.ttlMs ?? 30_000;
    const waitTimeoutMs = opts.waitTimeoutMs ?? 5_000;
    const retryIntervalMs = opts.retryIntervalMs ?? 100;
    const deadline = Date.now() + waitTimeoutMs;
    // 至少尝试一次
    do {
      const lease = await this.tryAcquire(key, ttlMs);
      if (lease) return lease;
      if (waitTimeoutMs <= 0) break;
      await new Promise((r) => setTimeout(r, retryIntervalMs));
    } while (Date.now() < deadline);
    throw new LockAcquireError(key);
  }

  /** 释放（仅持有者可释放） */
  async release(lease: LockLease): Promise<boolean> {
    return this.cache.releaseIfValue(lease.key, lease.token);
  }

  /** 续期（仅持有者） */
  async renew(lease: LockLease, ttlMs: number): Promise<boolean> {
    return this.cache.renewIfValue(lease.key, lease.token, ttlMs);
  }

  /**
   * 在分布式锁保护下执行函数；自动获取、看门狗续期、最终释放。
   */
  async withLock<T>(key: string, fn: () => Promise<T>, opts: WithLockOptions = {}): Promise<T> {
    const ttlMs = opts.ttlMs ?? 30_000;
    const lease = await this.acquire(key, opts);
    const watchdogIntervalMs =
      opts.watchdogIntervalMs === undefined ? Math.floor(ttlMs / 3) : opts.watchdogIntervalMs;

    let timer: ReturnType<typeof setInterval> | null = null;
    if (watchdogIntervalMs > 0) {
      timer = setInterval(() => {
        this.renew(lease, ttlMs).catch(() => undefined);
      }, watchdogIntervalMs);
      // 不阻止进程退出
      timer.unref?.();
    }

    try {
      return await fn();
    } finally {
      if (timer) clearInterval(timer);
      await this.release(lease);
    }
  }
}
