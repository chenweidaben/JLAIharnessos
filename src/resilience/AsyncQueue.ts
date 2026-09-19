/**
 * 健澜科技杠OS（jlmedaios）- 有界异步任务队列
 *
 * 面向医院高并发的批量/扇出场景：LIS 检验结果批量回推、危急值多渠道通知、
 * 门诊高峰时段的异步报表生成等。用有界队列削峰填谷（buffer）+ 固定并发 worker 限流，
 * 避免突发流量把下游数据库/消息网关直接打穿。
 *
 * 队列满策略（onFull）：
 *   - reject     ：立即拒绝（fail-fast），由调用方决定降级；
 *   - drop-newest：丢弃最新入队任务（保护队列中已有的高价值任务）；
 *   - drop-oldest：丢弃队首最老任务，腾出位置给新任务（适合流式近实时数据）；
 *   - backpressure：阻塞调用方直到队列腾出位置（生产者自我限流）。
 *
 * 纯内存实现；提供 drain() 优雅排空与 close() 关停。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { MedicalAgentError } from '../core/errors/index.js';
import { ResilienceErrorCodes } from './CircuitBreaker.js';

export type QueueOnFull = 'reject' | 'drop-newest' | 'drop-oldest' | 'backpressure';

export interface AsyncQueueOptions<T = unknown, R = unknown> {
  /** 队列名（指标/审计用） */
  name?: string;
  /** 并发 worker 数，默认 4 */
  concurrency?: number;
  /** 最大排队长度（不含正在执行的任务），默认 128 */
  maxSize?: number;
  /** 队列满策略，默认 reject */
  onFull?: QueueOnFull;
  /** 任务处理器：对每个入队 payload 执行并返回结果 */
  handler: (payload: T) => Promise<R>;
  /** backpressure 下单个 push 的最长等待（毫秒），<=0 无限等待，默认 30000 */
  backpressureWaitMs?: number;
}

export interface QueueMetrics {
  name: string;
  /** 排队中的任务数 */
  queued: number;
  /** 正在执行的 worker 数 */
  running: number;
  /** 累计入队成功的任务数 */
  enqueued: number;
  /** 累计完成（成功）数 */
  completed: number;
  /** 累计失败数 */
  failed: number;
  /** 累计因满策略丢弃/拒绝数 */
  dropped: number;
}

interface QueuedTask<T, R> {
  payload: T;
  resolve: (value: R) => void;
  reject: (err: unknown) => void;
}

export class AsyncQueue<T = unknown, R = unknown> {
  private readonly name: string;
  private readonly concurrency: number;
  private readonly maxSize: number;
  private readonly onFull: QueueOnFull;
  private readonly handler: (payload: T) => Promise<R>;
  private readonly backpressureWaitMs: number;

  private readonly buffer: QueuedTask<T, R>[] = [];
  private running = 0;
  private enqueuedCount = 0;
  private completedCount = 0;
  private failedCount = 0;
  private droppedCount = 0;
  private closed = false;

  /** backpressure 等待者：当队列腾出空位时唤醒 */
  private readonly waiters: Array<{ resolve: () => void; timer: ReturnType<typeof setTimeout> | undefined }> = [];

  constructor(options: AsyncQueueOptions<T, R>) {
    if (options.concurrency !== undefined && options.concurrency <= 0) {
      throw new MedicalAgentError('VALIDATION_ERROR', 'AsyncQueue concurrency 必须为正整数');
    }
    if (options.maxSize !== undefined && options.maxSize <= 0) {
      throw new MedicalAgentError('VALIDATION_ERROR', 'AsyncQueue maxSize 必须为正整数');
    }
    this.name = options.name ?? 'async-queue';
    this.concurrency = options.concurrency ?? 4;
    this.maxSize = options.maxSize ?? 128;
    this.onFull = options.onFull ?? 'reject';
    this.handler = options.handler;
    this.backpressureWaitMs = options.backpressureWaitMs ?? 30_000;
  }

  /** 当前排队长度 */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * 入队一个任务。返回该任务执行结果的 Promise。
   */
  push(payload: T): Promise<R> {
    if (this.closed) {
      return Promise.reject(
        new MedicalAgentError(ResilienceErrorCodes.QUEUE_REJECTED, `队列[${this.name}]已关闭，拒绝入队`),
      );
    }

    if (this.buffer.length >= this.maxSize) {
      return this.handleFull(payload);
    }
    return this.enqueue(payload);
  }

  /** 优雅排空：等待队列清空且所有 worker 完成在途任务 */
  async drain(): Promise<void> {
    while (this.buffer.length > 0 || this.running > 0) {
      await new Promise((r) => setTimeout(r, 5));
    }
  }

  /** 关闭队列：拒绝新任务，等待在途任务完成后 resolve */
  async close(): Promise<void> {
    this.closed = true;
    // 唤醒所有 backpressure 等待者，让它们各自拿到拒绝
    for (const w of this.waiters.splice(0)) {
      if (w.timer) clearTimeout(w.timer);
      w.resolve();
    }
    await this.drain();
  }

  getMetrics(): QueueMetrics {
    return {
      name: this.name,
      queued: this.buffer.length,
      running: this.running,
      enqueued: this.enqueuedCount,
      completed: this.completedCount,
      failed: this.failedCount,
      dropped: this.droppedCount,
    };
  }

  // ---------------- 内部 ----------------

  private enqueue(payload: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.buffer.push({ payload, resolve, reject });
      this.enqueuedCount++;
      this.schedule();
    });
  }

  private handleFull(payload: T): Promise<R> {
    switch (this.onFull) {
      case 'reject':
        this.droppedCount++;
        return Promise.reject(
          new MedicalAgentError(
            ResilienceErrorCodes.QUEUE_REJECTED,
            `队列[${this.name}]已满（${this.buffer.length}/${this.maxSize}），拒绝入队`,
            { name: this.name, size: this.buffer.length, max: this.maxSize },
          ),
        );
      case 'drop-newest':
        this.droppedCount++;
        return Promise.reject(
          new MedicalAgentError(
            ResilienceErrorCodes.QUEUE_REJECTED,
            `队列[${this.name}]已满，按 drop-newest 丢弃新任务`,
            { name: this.name },
          ),
        );
      case 'drop-oldest': {
        const old = this.buffer.shift();
        this.droppedCount++;
        old?.reject(
          new MedicalAgentError(
            ResilienceErrorCodes.QUEUE_REJECTED,
            `队列[${this.name}]已满，按 drop-oldest 丢弃最旧任务`,
            { name: this.name },
          ),
        );
        return this.enqueue(payload);
      }
      case 'backpressure':
        return this.waitForSpace().then(() => {
          if (this.closed) {
            return Promise.reject(
              new MedicalAgentError(ResilienceErrorCodes.QUEUE_REJECTED, `队列[${this.name}]已关闭`),
            );
          }
          return this.enqueue(payload);
        });
    }
  }

  /** 等待队列腾出一个空位（带超时） */
  private waitForSpace(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const waiter = { resolve, timer: undefined as ReturnType<typeof setTimeout> | undefined };
      if (this.backpressureWaitMs > 0) {
        waiter.timer = setTimeout(() => {
          const idx = this.waiters.indexOf(waiter);
          if (idx >= 0) this.waiters.splice(idx, 1);
          this.droppedCount++;
          reject(
            new MedicalAgentError(
              ResilienceErrorCodes.QUEUE_REJECTED,
              `队列[${this.name}]背压等待超时（>${this.backpressureWaitMs}ms）`,
              { name: this.name },
            ),
          );
        }, this.backpressureWaitMs);
        if (typeof waiter.timer === 'object' && 'unref' in waiter.timer) {
          (waiter.timer as unknown as { unref: () => void }).unref();
        }
      }
      this.waiters.push(waiter);
    });
  }

  /** 尝试启动新的 worker（不超过 concurrency） */
  private schedule(): void {
    while (this.running < this.concurrency && this.buffer.length > 0) {
      const task = this.buffer.shift();
      if (!task) break;
      this.running++;
      void this.run(task);
    }
  }

  private async run(task: QueuedTask<T, R>): Promise<void> {
    try {
      const result = await this.handler(task.payload);
      this.completedCount++;
      task.resolve(result);
    } catch (err) {
      this.failedCount++;
      task.reject(err);
    } finally {
      this.running--;
      // 有任务被处理完，通知 backpressure 等待者
      this.notifyWaiters();
      this.schedule();
    }
  }

  private notifyWaiters(): void {
    // 队列有空闲空位时唤醒一个等待者
    if (this.buffer.length < this.maxSize && this.waiters.length > 0) {
      const w = this.waiters.shift();
      if (w) {
        if (w.timer) clearTimeout(w.timer);
        w.resolve();
      }
    }
  }
}
