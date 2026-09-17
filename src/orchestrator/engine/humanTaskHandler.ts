/**
 * 健澜科技杠OS - 进程内人工任务处理器（默认实现）
 *
 * 实现 IHumanTaskHandler：human 节点创建审核任务后挂起等待，
 * 外部（BFF/前端工单中心）调用 resolve() 解除挂起，工作流继续执行。
 *
 * 该实现基于 Promise 在单进程内完成挂起/恢复，天然保留 async 调用栈，
 * 适用于单体部署与演示；分布式部署可替换为基于 Redis/DB 的实现（接口不变）。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type {
  HumanResolution,
  IHumanTaskHandler,
  PendingHumanTask,
} from './runtime.js';

interface PendingEntry {
  task: PendingHumanTask;
  resolve: (r: HumanResolution) => void;
  reject: (e: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

/** 人工任务超时错误 */
export class HumanTaskTimeoutError extends Error {
  constructor(public readonly taskId: string) {
    super(`人工任务超时未处理: ${taskId}`);
    this.name = 'HumanTaskTimeoutError';
  }
}

/** 人工任务被取消错误 */
export class HumanTaskCancelledError extends Error {
  constructor(public readonly taskId: string) {
    super(`人工任务已取消: ${taskId}`);
    this.name = 'HumanTaskCancelledError';
  }
}

/**
 * 进程内人工任务处理器
 */
export class InMemoryHumanTaskHandler implements IHumanTaskHandler {
  private readonly pending = new Map<string, PendingEntry>();

  /** 监听器（任务创建/解决时通知，供 UI 推送） */
  private listeners: ((event: { type: 'created' | 'resolved'; taskId: string; task?: PendingHumanTask }) => void)[] = [];

  async createTask(task: PendingHumanTask): Promise<void> {
    // 已存在则幂然返回（重试场景）
    if (this.pending.has(task.taskId)) return;

    const entry: Partial<PendingEntry> = { task };
    const promise = new Promise<HumanResolution>((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
    });
    this.pending.set(task.taskId, entry as PendingEntry);
    (entry as PendingEntry & { promise: Promise<HumanResolution> }).promise = promise;

    // 超时处理
    if (task.timeoutMs && task.timeoutMs > 0) {
      entry.timer = setTimeout(() => {
        const e = this.pending.get(task.taskId);
        if (e) {
          this.pending.delete(task.taskId);
          e.reject(new HumanTaskTimeoutError(task.taskId));
        }
      }, task.timeoutMs);
    }

    this.listeners.forEach((l) => l({ type: 'created', taskId: task.taskId, task }));
  }

  waitForResolution(task: PendingHumanTask): Promise<HumanResolution> {
    const entry = this.pending.get(task.taskId);
    if (!entry) {
      return Promise.reject(new Error(`人工任务不存在: ${task.taskId}`));
    }
    return (entry as PendingEntry & { promise: Promise<HumanResolution> }).promise;
  }

  resolve(taskId: string, resolution: HumanResolution): void {
    const entry = this.pending.get(taskId);
    if (!entry) {
      throw new Error(`无法处理：人工任务不存在或已处理: ${taskId}`);
    }
    if (entry.timer) clearTimeout(entry.timer);
    this.pending.delete(taskId);
    entry.resolve({ ...resolution, taskId });
    this.listeners.forEach((l) => l({ type: 'resolved', taskId }));
  }

  /** 取消某任务（工作流整体取消时调用） */
  cancel(taskId: string): void {
    const entry = this.pending.get(taskId);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    this.pending.delete(taskId);
    entry.reject(new HumanTaskCancelledError(taskId));
  }

  /** 取消全部待办（引擎实例取消时） */
  cancelAll(): void {
    for (const taskId of Array.from(this.pending.keys())) {
      this.cancel(taskId);
    }
  }

  /** 列出待处理任务（供工单中心/UI） */
  listPending(filter?: { assigneeRoles?: string[]; assigneeUserIds?: string[] }): PendingHumanTask[] {
    const all = Array.from(this.pending.values()).map((e) => e.task);
    if (!filter) return all;
    return all.filter((t) => {
      const roleHit = !filter.assigneeRoles ||
        filter.assigneeRoles.some((r) => t.assigneeRoles.includes(r));
      const userHit = !filter.assigneeUserIds ||
        t.assigneeUserIds?.some((u) => filter.assigneeUserIds!.includes(u));
      return roleHit || userHit;
    });
  }

  /** 待办数量 */
  get pendingCount(): number {
    return this.pending.size;
  }

  /** 订阅任务事件 */
  subscribe(listener: (event: { type: 'created' | 'resolved'; taskId: string; task?: PendingHumanTask }) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
