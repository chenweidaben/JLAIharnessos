/**
 * 健澜科技杠OS - 执行记录器
 *
 * 记录工作流实例执行过程中的全部事件，用于：
 *   - 低代码画布的实时高亮与执行回放；
 *   - 医疗行为审计（谁、在什么患者上下文、调用了什么工具、结果如何）；
 *   - 耗时 / Token / 成功率统计与故障排查。
 *
 * 记录器只做追加（append-only），事件不可篡改，便于导出为审计凭证。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/** 执行事件类型 */
export enum ExecutionEventType {
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  WORKFLOW_PAUSED = 'workflow_paused',
  WORKFLOW_CANCELLED = 'workflow_cancelled',
  NODE_STARTED = 'node_started',
  NODE_COMPLETED = 'node_completed',
  NODE_FAILED = 'node_failed',
  NODE_SKIPPED = 'node_skipped',
  NODE_RETRYING = 'node_retrying',
  HUMAN_TASK_CREATED = 'human_task_created',
  HUMAN_TASK_RESOLVED = 'human_task_resolved',
  TOOL_CONFIRMATION = 'tool_confirmation',
  PARALLEL_FORK = 'parallel_fork',
  PARALLEL_JOIN = 'parallel_join',
  LOOP_ITERATION = 'loop_iteration',
}

/** 执行事件 */
export interface ExecutionEvent {
  /** 单调递增序号 */
  seq: number;
  /** 事件类型 */
  type: ExecutionEventType;
  /** 时间戳 */
  timestamp: number;
  /** 工作流实例 ID */
  instanceId: string;
  /** 关联节点 ID */
  nodeId?: string;
  /** 追踪 ID */
  traceId?: string;
  /** 事件负载（已脱敏） */
  payload?: unknown;
}

/** 执行摘要 */
export interface ExecutionSummary {
  instanceId: string;
  workflowId: string;
  status: string;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  nodesExecuted: number;
  nodesFailed: number;
  totalAttempts: number;
  tokens: { input: number; output: number };
}

/**
 * 执行记录器
 */
export class ExecutionRecorder {
  private readonly events: ExecutionEvent[] = [];
  private seq = 0;
  readonly startedAt = Date.now();
  private finishedAt?: number;
  private tokens = { input: 0, output: 0 };
  private nodesExecuted = new Set<string>();
  private nodesFailed = new Set<string>();
  private totalAttempts = 0;

  constructor(
    public readonly instanceId: string,
    public readonly workflowId: string,
    public readonly traceId: string,
  ) {}

  /** 追加事件 */
  record(type: ExecutionEventType, payload?: unknown, nodeId?: string): ExecutionEvent {
    const event: ExecutionEvent = {
      seq: this.seq++,
      type,
      timestamp: Date.now(),
      instanceId: this.instanceId,
      nodeId,
      traceId: this.traceId,
      payload,
    };
    this.events.push(event);

    // 维护统计
    switch (type) {
      case ExecutionEventType.NODE_STARTED:
      case ExecutionEventType.NODE_RETRYING:
        this.totalAttempts++;
        break;
      case ExecutionEventType.NODE_COMPLETED:
        if (nodeId) this.nodesExecuted.add(nodeId);
        if (payload && typeof payload === 'object' && 'tokens' in payload) {
          const t = (payload as { tokens?: { input?: number; output?: number } }).tokens;
          if (t) {
            this.tokens.input += t.input ?? 0;
            this.tokens.output += t.output ?? 0;
          }
        }
        break;
      case ExecutionEventType.NODE_FAILED:
        if (nodeId) this.nodesFailed.add(nodeId);
        break;
      case ExecutionEventType.WORKFLOW_COMPLETED:
      case ExecutionEventType.WORKFLOW_FAILED:
      case ExecutionEventType.WORKFLOW_CANCELLED:
        this.finishedAt = Date.now();
        break;
      default:
        break;
    }
    return event;
  }

  /** 获取全部事件（只读副本） */
  getEvents(): readonly ExecutionEvent[] {
    return this.events;
  }

  /** 获取某节点相关事件 */
  getNodeEvents(nodeId: string): ExecutionEvent[] {
    return this.events.filter((e) => e.nodeId === nodeId);
  }

  /** 生成执行摘要 */
  summarize(status: string): ExecutionSummary {
    return {
      instanceId: this.instanceId,
      workflowId: this.workflowId,
      status,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      durationMs: (this.finishedAt ?? Date.now()) - this.startedAt,
      nodesExecuted: this.nodesExecuted.size,
      nodesFailed: this.nodesFailed.size,
      totalAttempts: this.totalAttempts,
      tokens: { ...this.tokens },
    };
  }

  /** 导出为可序列化 JSON（审计/回放） */
  toJSON(): Record<string, unknown> {
    return {
      instanceId: this.instanceId,
      workflowId: this.workflowId,
      traceId: this.traceId,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      events: this.events,
    };
  }
}
