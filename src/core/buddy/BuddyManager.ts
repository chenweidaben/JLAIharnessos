/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 子代理管理器（BuddyManager）
 * 管理科室子代理的完整生命周期：创建 → 分配任务 → 执行 → 回收 → 销毁。
 * 提供实例池复用、状态监控、超时处理与失败重试。
 * 对应设计文档：02-Agent能力与医疗工具设计 §5.5 子代理创建与任务分配机制。
 */

import { MedicalBuddy, type SharedPatientCache } from './MedicalBuddy';
import type { BuddyResult, BuddySnapshot, BuddyTask, LLMClient, SpecialtyConfig } from './types';

/** 默认超时表（毫秒），科室配置未指定时回退 */
const DEFAULT_TIMEOUT_BY_DEPARTMENT: Readonly<Record<string, number>> = {
  emergency: 30_000,
  icu: 60_000,
  'operating-room': 45_000,
  'medical-technology': 60_000,
  pediatrics: 90_000,
  'obstetrics-gynecology': 90_000,
  'internal-medicine': 120_000,
  surgery: 120_000,
};

/** 默认最大空闲实例数（每种科室） */
const DEFAULT_MAX_IDLE_PER_TYPE = 2;

/**
 * 子代理管理器
 *
 * 进程内单例，按需创建 MedicalBuddy 实例并池化复用。
 * 通过异步模拟并发，不依赖真实多线程/多进程。
 */
export class BuddyManager {
  /** 空闲实例池：agentType -> 可复用实例列表 */
  private readonly pool = new Map<string, MedicalBuddy[]>();
  /** 运行中实例：buddyId -> 实例 */
  private readonly running = new Map<string, MedicalBuddy>();
  /** 已完成的结果记录（供查询） */
  private readonly history: BuddyResult[] = [];
  /** 实例ID自增序号 */
  private buddySeq = 0;

  /**
   * @param llm - LLM 客户端
   * @param configs - 科室配置表（agentType -> 配置）
   * @param options - 池化与重试选项
   */
  constructor(
    private readonly llm: LLMClient,
    private readonly configs: ReadonlyMap<string, SpecialtyConfig>,
    private readonly options: {
      maxIdlePerType?: number;
      maxRetries?: number;
      sharedCache?: SharedPatientCache;
    } = {},
  ) {}

  /**
   * 派发一个子代理任务
   *
   * 流程：获取/创建实例 → 执行 → 失败重试 → 回收实例 → 记录结果。
   *
   * @param task - 子代理任务
   * @param patient - 患者上下文
   */
  async dispatch(task: BuddyTask, patient: Record<string, unknown> = {}): Promise<BuddyResult> {
    const config = this.configs.get(task.agentType);
    if (!config) {
      return this.errorResult(task, 'CONFIG_NOT_FOUND', `未注册的科室代理: ${task.agentType}`);
    }

    const maxRetries = this.options.maxRetries ?? 1;
    let lastResult: BuddyResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const buddy = this.acquire(config.agentType, config);
      this.running.set(buddy.buddyId, buddy);

      try {
        const result = await buddy.run(task, patient);
        this.running.delete(buddy.buddyId);
        this.release(buddy);
        this.history.push(result);
        if (result.status === 'completed') return result;
        lastResult = result;
        // 失败/超时：可重试
      } catch (err) {
        this.running.delete(buddy.buddyId);
        this.release(buddy);
        lastResult = this.errorResult(
          task,
          'DISPATCH_ERROR',
          err instanceof Error ? err.message : String(err),
        );
        this.history.push(lastResult);
      }
    }

    return lastResult ?? this.errorResult(task, 'UNKNOWN', '子代理执行失败');
  }

  /**
   * 列出全部子代理实例快照（含运行中与空闲）
   */
  listSnapshots(): BuddySnapshot[] {
    const snapshots: BuddySnapshot[] = [];
    for (const [, list] of this.pool) {
      for (const b of list) snapshots.push(this.toSnapshot(b));
    }
    for (const [, b] of this.running) {
      snapshots.push(this.toSnapshot(b));
    }
    return snapshots;
  }

  /**
   * 查询某任务的执行结果
   */
  getResult(taskId: string): BuddyResult | undefined {
    return this.history.find((r) => r.taskId === taskId);
  }

  /**
   * 全部历史结果（按完成时间倒序）
   */
  listHistory(): readonly BuddyResult[] {
    return [...this.history].sort((a, b) => b.completedAt - a.completedAt);
  }

  /**
   * 关闭管理器：清空实例池与运行中实例
   */
  shutdown(): void {
    this.pool.clear();
    this.running.clear();
  }

  /** 池中空闲实例总数 */
  get idleCount(): number {
    let n = 0;
    for (const [, list] of this.pool) n += list.length;
    return n;
  }

  /** 运行中实例总数 */
  get runningCount(): number {
    return this.running.size;
  }

  // ----------------------------------------------------------
  // 内部方法
  // ----------------------------------------------------------

  /** 从池中取实例，无则新建 */
  private acquire(agentType: string, config: SpecialtyConfig): MedicalBuddy {
    const list = this.pool.get(agentType);
    if (list && list.length > 0) {
      const buddy = list.pop()!;
      return buddy;
    }
    this.buddySeq++;
    return new MedicalBuddy(
      `${agentType}-buddy-${this.buddySeq}`,
      config,
      this.llm,
      this.options.sharedCache,
    );
  }

  /** 回收实例到池（受最大空闲数限制） */
  private release(buddy: MedicalBuddy): void {
    buddy.recycle();
    const maxIdle = this.options.maxIdlePerType ?? DEFAULT_MAX_IDLE_PER_TYPE;
    const list = this.pool.get(buddy.config.agentType) ?? [];
    if (list.length < maxIdle) {
      list.push(buddy);
      this.pool.set(buddy.config.agentType, list);
    }
    // 超出上限的实例直接丢弃（等待 GC）
  }

  /** 实例 -> 快照 */
  private toSnapshot(buddy: MedicalBuddy): BuddySnapshot {
    return {
      buddyId: buddy.buddyId,
      agentType: buddy.config.agentType,
      status: buddy.currentStatus,
      completedTasks: buddy.completedCount,
      totalRunMs: 0,
    };
  }

  /** 构造错误结果 */
  private errorResult(task: BuddyTask, code: string, message: string): BuddyResult {
    return {
      taskId: task.taskId,
      buddyId: 'none',
      agentType: task.agentType,
      status: 'failed',
      summary: `调度失败: ${message}`,
      toolsUsed: [],
      confidence: 0,
      durationMs: 0,
      tokens: 0,
      error: `${code}: ${message}`,
      completedAt: Date.now(),
    };
  }
}

/**
 * 根据科室类型获取默认超时
 *
 * 急诊 30s、ICU/医技 60s、手术室 45s、儿科/妇产 90s、内科/外科 120s。
 *
 * @param agentType - 科室代理类型
 */
export function defaultTimeoutFor(agentType: string): number {
  return DEFAULT_TIMEOUT_BY_DEPARTMENT[agentType] ?? 60_000;
}
