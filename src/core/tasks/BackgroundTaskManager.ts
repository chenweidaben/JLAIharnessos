/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 后台任务管理器（BackgroundTaskManager）
 * 基于 TaskQueue 封装异步后台任务：批量数据分析、报告生成等。
 * 提供进度追踪、完成通知与任务取消。
 */

import { type TaskPriority, TaskQueue, type TaskRecord } from './TaskQueue';

/** 后台任务进度快照 */
export interface BackgroundTaskStatus {
  /** 任务ID */
  readonly taskId: string;
  /** 任务名称 */
  readonly name: string;
  /** 状态 */
  readonly state: TaskRecord['state'];
  /** 进度（0-100） */
  readonly progress: number;
  /** 进度描述（如"正在分析第 120/1000 例"） */
  readonly progressMessage: string;
  /** 结果（完成时） */
  readonly result?: unknown;
  /** 错误信息（失败时） */
  readonly error?: string;
  /** 开始时间 */
  readonly startedAt?: number;
  /** 完成时间 */
  readonly completedAt?: number;
}

/** 后台任务处理器：通过 onProgress 上报进度 */
export type BackgroundTaskHandler = (
  payload: unknown,
  onProgress: (percent: number, message: string) => void,
) => Promise<unknown>;

/** 完成通知回调 */
type CompletionListener = (status: BackgroundTaskStatus) => void;

/**
 * 后台任务管理器
 *
 * 对 TaskQueue 的业务级封装，面向"可进度追踪的长时任务"场景。
 */
export class BackgroundTaskManager {
  /** 内部任务队列 */
  private readonly queue: TaskQueue;
  /** 任务进度表 */
  private readonly progress = new Map<string, { percent: number; message: string }>();
  /** 完成通知监听器 */
  private readonly completionListeners = new Set<CompletionListener>();

  /**
   * @param queue - 可选的外部队列（不传则内部新建）
   */
  constructor(queue?: TaskQueue) {
    this.queue = queue ?? new TaskQueue(2);
    this.queue.on((event) => {
      if (event.type === 'completed' || event.type === 'failed') {
        this.notifyCompletion(event.task);
      }
    });
  }

  /**
   * 提交一个后台任务
   *
   * @param name - 任务名称
   * @param payload - 任务数据
   * @param handler - 任务处理器
   * @param priority - 优先级（默认 routine）
   * @returns 任务ID
   */
  submit(
    name: string,
    payload: unknown,
    handler: BackgroundTaskHandler,
    priority: TaskPriority = 'routine',
  ): string {
    this.progress.set(name, { percent: 0, message: '已入队' });

    return this.queue.enqueue({
      name,
      priority,
      payload,
      handler: async (p) => {
        const onProgress = (percent: number, message: string) => {
          this.progress.set(name, { percent, message });
        };
        onProgress(0, '开始执行');
        const result = await handler(p, onProgress);
        onProgress(100, '已完成');
        return result;
      },
    });
  }

  /**
   * 查询任务状态
   *
   * @param taskId - 任务ID
   */
  getStatus(taskId: string): BackgroundTaskStatus | undefined {
    const task = this.queue.getTask(taskId);
    if (!task) return undefined;
    const prog = this.progress.get(task.name) ?? { percent: 0, message: '' };
    return {
      taskId,
      name: task.name,
      state: task.state,
      progress: prog.percent,
      progressMessage: prog.message,
      result: task.result,
      error: task.error,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    };
  }

  /**
   * 取消任务
   *
   * @param taskId - 任务ID
   */
  cancel(taskId: string): boolean {
    return this.queue.cancel(taskId);
  }

  /**
   * 订阅任务完成通知
   *
   * @param listener - 回调
   * @returns 取消订阅函数
   */
  onComplete(listener: CompletionListener): () => void {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }

  /** 全部后台任务列表 */
  listAll(): readonly BackgroundTaskStatus[] {
    return this.queue
      .list()
      .map((t) => this.getStatus(t.id))
      .filter((s): s is BackgroundTaskStatus => !!s);
  }

  // ----------------------------------------------------------
  // 内部方法
  // ----------------------------------------------------------

  /** 通知完成监听器 */
  private notifyCompletion(task: TaskRecord): void {
    const status = this.getStatus(task.id);
    if (!status) return;
    for (const listener of this.completionListeners) {
      try {
        listener(status);
      } catch {
        // 监听器异常不影响主流程
      }
    }
  }
}
