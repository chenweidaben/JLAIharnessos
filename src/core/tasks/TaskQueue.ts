/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 任务队列（TaskQueue）
 * 基于优先级 + FIFO 的异步任务调度器，支持并发控制与任务依赖。
 * 优先级：stat（紧急）> urgent（高）> routine（常规）。
 */

/** 任务状态 */
export type TaskState =
  | 'pending' // 等待中
  | 'running' // 运行中
  | 'completed' // 已完成
  | 'failed' // 失败
  | 'cancelled'; // 已取消

/** 任务优先级 */
export type TaskPriority = 'stat' | 'urgent' | 'routine';

/** 任务处理器类型 */
export type TaskHandler = (payload: unknown) => Promise<unknown>;

/** 任务定义（入队时） */
export interface TaskDefinition {
  /** 任务名称 */
  readonly name: string;
  /** 优先级 */
  readonly priority: TaskPriority;
  /** 任务数据 */
  readonly payload?: unknown;
  /** 任务处理器 */
  readonly handler: TaskHandler;
  /** 依赖的任务ID列表（依赖全部完成后才执行） */
  readonly dependsOn?: readonly string[];
}

/** 任务记录（运行时） */
export interface TaskRecord {
  readonly id: string;
  readonly name: string;
  readonly priority: TaskPriority;
  readonly payload: unknown;
  readonly handler: TaskHandler;
  readonly dependsOn: readonly string[];
  state: TaskState;
  readonly enqueuedAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
}

/** 优先级数值（越大越先执行） */
const PRIORITY_RANK: Readonly<Record<TaskPriority, number>> = {
  stat: 3,
  urgent: 2,
  routine: 1,
};

/** 任务队列事件 */
export type TaskQueueEvent =
  | { type: 'enqueued'; task: TaskRecord }
  | { type: 'started'; task: TaskRecord }
  | { type: 'completed'; task: TaskRecord; result: unknown }
  | { type: 'failed'; task: TaskRecord; error: string }
  | { type: 'cancelled'; task: TaskRecord };

/** 事件回调 */
type Listener = (event: TaskQueueEvent) => void;

/**
 * 任务队列
 *
 * 单进程异步调度器：按优先级挑选可执行任务，限制最大并发，
 * 等待任务依赖完成后再放行。
 */
export class TaskQueue {
  /** 全部任务记录 */
  private readonly tasks = new Map<string, TaskRecord>();
  /** 事件监听器 */
  private readonly listeners = new Set<Listener>();
  /** 任务ID自增 */
  private seq = 0;
  /** 是否正在运行调度 */
  private running = false;
  /** 当前运行中任务数 */
  private activeCount = 0;

  /**
   * @param maxConcurrency - 最大并发任务数
   */
  constructor(private readonly maxConcurrency = 4) {}

  /**
   * 入队一个任务
   *
   * @param def - 任务定义
   * @returns 任务ID
   */
  enqueue(def: TaskDefinition): string {
    this.seq++;
    const id = `task_${Date.now()}_${this.seq}`;
    const record: TaskRecord = {
      id,
      name: def.name,
      priority: def.priority,
      payload: def.payload,
      handler: def.handler,
      dependsOn: def.dependsOn ?? [],
      state: 'pending',
      enqueuedAt: Date.now(),
    };
    this.tasks.set(id, record);
    this.emit({ type: 'enqueued', task: record });
    this.schedule();
    return id;
  }

  /**
   * 取消任务（仅 pending 状态可取消）
   *
   * @param id - 任务ID
   */
  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (task?.state !== 'pending') return false;
    task.state = 'cancelled';
    this.emit({ type: 'cancelled', task });
    this.schedule();
    return true;
  }

  /**
   * 查询任务状态
   */
  getTask(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  /**
   * 列出全部任务（按入队时间倒序）
   */
  list(): readonly TaskRecord[] {
    return [...this.tasks.values()].sort((a, b) => b.enqueuedAt - a.enqueuedAt);
  }

  /** 当前 pending 任务数 */
  get pendingCount(): number {
    return [...this.tasks.values()].filter((t) => t.state === 'pending').length;
  }

  /** 当前 running 任务数 */
  get runningCount(): number {
    return this.activeCount;
  }

  /**
   * 订阅队列事件
   *
   * @param listener - 回调
   * @returns 取消订阅函数
   */
  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ----------------------------------------------------------
  // 内部调度
  // ----------------------------------------------------------

  /** 触发一次调度检查 */
  private schedule(): void {
    if (this.running) return;
    this.running = true;
    // 异步执行，避免阻塞入队调用栈；drain 内部已 try/catch 兜底
    queueMicrotask(() => {
      void this.drain();
    });
  }

  /** 调度循环：挑选可执行任务并启动 */
  private async drain(): Promise<void> {
    try {
      while (this.activeCount < this.maxConcurrency) {
        const next = this.pickNext();
        if (!next) break;
        void this.execute(next);
      }
    } finally {
      this.running = false;
    }
  }

  /** 按优先级 + FIFO 挑选下一个可执行任务 */
  private pickNext(): TaskRecord | undefined {
    const candidates = [...this.tasks.values()]
      .filter((t) => t.state === 'pending')
      .filter((t) => this.dependenciesSatisfied(t));

    candidates.sort((a, b) => {
      const dr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      return dr !== 0 ? dr : a.enqueuedAt - b.enqueuedAt;
    });
    return candidates[0];
  }

  /** 依赖是否全部完成 */
  private dependenciesSatisfied(task: TaskRecord): boolean {
    return task.dependsOn.every((depId) => {
      const dep = this.tasks.get(depId);
      return dep?.state === 'completed';
    });
  }

  /** 执行单个任务 */
  private async execute(task: TaskRecord): Promise<void> {
    task.state = 'running';
    task.startedAt = Date.now();
    this.activeCount++;
    this.emit({ type: 'started', task });

    try {
      const result = await task.handler(task.payload);
      task.state = 'completed';
      task.completedAt = Date.now();
      task.result = result;
      this.emit({ type: 'completed', task, result });
    } catch (err) {
      task.state = 'failed';
      task.completedAt = Date.now();
      task.error = err instanceof Error ? err.message : String(err);
      this.emit({ type: 'failed', task, error: task.error });
    } finally {
      this.activeCount--;
      // 任务完成后，可能解锁了下游依赖任务
      this.schedule();
    }
  }

  /** 广播事件 */
  private emit(event: TaskQueueEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 监听器异常不影响队列主流程
      }
    }
  }
}
