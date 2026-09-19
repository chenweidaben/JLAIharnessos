/**
 * 健澜科技杠OS（jlmedaios）- 并发限流器（异步信号量）
 *
 * 用于限制对同一稀缺资源的在途并发数，例如：同时打开的 DICOM 视图连接数、
 * 并发访问 HIS 网关的连接数、同时执行的大模型流式会话数等。
 *
 * 等待者按 FIFO 排队；支持获取超时。纯内存实现，进程内零依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { MedicalAgentError } from '../core/errors/index.js';
import { ResilienceErrorCodes } from './CircuitBreaker.js';

export interface ConcurrencyLimiterOptions {
  /** 最大并发许可数（池子大小） */
  pool: number;
  /** 名称（指标/审计用） */
  name?: string;
  /** 获取许可的超时时间（毫秒），<=0 表示无限等待，默认 0 */
  acquireTimeoutMs?: number;
}

export interface LimiterMetrics {
  name: string;
  pool: number;
  /** 当前已占用许可数 */
  acquired: number;
  /** 当前排队等待数 */
  pending: number;
}

interface Waiter {
  resolve: () => void;
  reject: (err: unknown) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
}

export class ConcurrencyLimiter {
  private readonly pool: number;
  private readonly name: string;
  private readonly acquireTimeoutMs: number;
  private acquired = 0;
  private readonly queue: Waiter[] = [];

  constructor(options: ConcurrencyLimiterOptions) {
    if (options.pool <= 0) {
      throw new MedicalAgentError(
        'VALIDATION_ERROR',
        'ConcurrencyLimiter pool 必须为正整数',
        { pool: options.pool },
      );
    }
    this.pool = options.pool;
    this.name = options.name ?? 'semaphore';
    this.acquireTimeoutMs = options.acquireTimeoutMs ?? 0;
  }

  /** 当前空闲许可数 */
  get available(): number {
    return this.pool - this.acquired;
  }

  /**
   * 获取一个许可。返回 release 函数，必须在 finally 中调用，否则许可永久泄漏。
   */
  acquire(): Promise<() => void> {
    if (this.acquired < this.pool) {
      this.acquired++;
      return Promise.resolve(this.release.bind(this));
    }

    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, timer: undefined };
      if (this.acquireTimeoutMs > 0) {
        waiter.timer = setTimeout(() => {
          // 超时：从队列移除并拒绝
          const idx = this.queue.indexOf(waiter);
          if (idx >= 0) this.queue.splice(idx, 1);
          reject(
            new MedicalAgentError(
              ResilienceErrorCodes.CONCURRENCY_TIMEOUT,
              `信号量[${this.name}]等待获取许可超时（>${this.acquireTimeoutMs}ms）`,
              { name: this.name, acquired: this.acquired, pending: this.queue.length },
            ),
          );
        }, this.acquireTimeoutMs);
        if (typeof waiter.timer === 'object' && 'unref' in waiter.timer) {
          (waiter.timer as unknown as { unref: () => void }).unref();
        }
      }
      this.queue.push(waiter);
    }).then(() => {
      this.acquired++;
      return this.release.bind(this);
    });
  }

  /** 在许可保护下执行 fn，自动释放 */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** 释放一个许可，唤醒队首等待者（等待者在其 .then 中自行重新占用） */
  private release(): void {
    if (this.acquired <= 0) return;
    this.acquired--;
    const next = this.queue.shift();
    if (next) {
      if (next.timer) clearTimeout(next.timer);
      // 仅唤醒；占用计数由等待者 acquire().then 中的 acquired++ 完成，避免重复计数
      next.resolve();
    }
  }

  getMetrics(): LimiterMetrics {
    return {
      name: this.name,
      pool: this.pool,
      acquired: this.acquired,
      pending: this.queue.length,
    };
  }
}
