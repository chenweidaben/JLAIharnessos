/**
 * 健澜科技杠OS（jlmedaios）- 舱壁隔离（Bulkhead）
 *
 * 按资源/业务域隔离并发上限，避免某一类突发流量（如检验结果批量回推）
 * 挤占全院接口的连接与协程，造成故障扩散。
 *
 * 策略：
 *   - reject：资源已满时立即拒绝（fail-fast），保护下游；
 *   - queue ：资源已满时排队等待（基于 ConcurrencyLimiter 信号量）。
 *
 * 每个资源独立统计指标，便于监控某类业务的拥塞情况。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { MedicalAgentError } from '../core/errors/index.js';
import { ResilienceErrorCodes } from './CircuitBreaker.js';
import { ConcurrencyLimiter, type LimiterMetrics } from './ConcurrencyLimiter.js';

export type BulkheadPolicy = 'reject' | 'queue';

export interface BulkheadResourceOptions {
  /** 资源名，如 lab-query、dicom-stream、llm-invoke */
  name: string;
  /** 该资源允许的最大并发 */
  maxConcurrent: number;
  /** 满时策略，默认 reject */
  policy?: BulkheadPolicy;
  /** 排队策略下等待许可的超时（毫秒），<=0 无限等待，默认 5000 */
  queueAcquireTimeoutMs?: number;
}

interface ResourceEntry {
  options: BulkheadResourceOptions;
  limiter: ConcurrencyLimiter;
  running: number;
  /** reject 策略下累计被拒绝次数 */
  rejected: number;
}

export class Bulkhead {
  private readonly resources = new Map<string, ResourceEntry>();

  /** 注册一个舱壁资源 */
  register(options: BulkheadResourceOptions): void {
    if (this.resources.has(options.name)) return;
    this.resources.set(options.name, {
      options,
      limiter: new ConcurrencyLimiter({
        pool: options.maxConcurrent,
        name: `bulkhead:${options.name}`,
        acquireTimeoutMs: options.queueAcquireTimeoutMs ?? 5000,
      }),
      running: 0,
      rejected: 0,
    });
  }

  /**
   * 在指定资源舱壁内执行 fn。
   * reject 策略下资源已满将立即抛出受控错误。
   */
  async execute<T>(resource: string, fn: () => Promise<T>): Promise<T> {
    const entry = this.require(resource);
    const policy = entry.options.policy ?? 'reject';

    if (policy === 'reject') {
      // 立即判断是否已满，不排队
      if (entry.running >= entry.options.maxConcurrent) {
        entry.rejected++;
        throw new MedicalAgentError(
          ResilienceErrorCodes.BULKHEAD_REJECTED,
          `舱壁[${resource}]并发已满（${entry.running}/${entry.options.maxConcurrent}），已拒绝`,
          { resource, running: entry.running, max: entry.options.maxConcurrent },
        );
      }
      entry.running++;
      try {
        return await fn();
      } finally {
        entry.running--;
      }
    }

    // queue 策略：借助信号量排队
    try {
      return await entry.limiter.runExclusive(async () => {
        entry.running++;
        try {
          return await fn();
        } finally {
          entry.running--;
        }
      });
    } catch (err) {
      // 信号量超时/被取消时归因为舱壁拒绝，便于上层统一处理
      if (err instanceof MedicalAgentError && err.code === ResilienceErrorCodes.CONCURRENCY_TIMEOUT) {
        entry.rejected++;
        throw new MedicalAgentError(
          ResilienceErrorCodes.BULKHEAD_REJECTED,
          `舱壁[${resource}]排队等待超时，已拒绝`,
          { resource, cause: err.message },
        );
      }
      throw err;
    }
  }

  /** 读取某资源指标 */
  metrics(resource: string): LimiterMetrics & { running: number; rejected: number; policy: BulkheadPolicy } {
    const entry = this.require(resource);
    const base = entry.limiter.getMetrics();
    return {
      ...base,
      running: entry.running,
      rejected: entry.rejected,
      policy: entry.options.policy ?? 'reject',
    };
  }

  /** 全部资源指标快照 */
  allMetrics(): Array<ReturnType<Bulkhead['metrics']>> {
    return [...this.resources.keys()].map((r) => this.metrics(r));
  }

  private require(resource: string): ResourceEntry {
    const entry = this.resources.get(resource);
    if (!entry) {
      throw new MedicalAgentError(
        'VALIDATION_ERROR',
        `舱壁资源[${resource}]未注册`,
        { resource, known: [...this.resources.keys()] },
      );
    }
    return entry;
  }
}
