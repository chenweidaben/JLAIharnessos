/**
 * 健澜AI原生医院操作系统OS - 执行记录器
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

/** 模型调用分布条目 */
export interface ModelCallSummary {
  modelId: string;
  calls: number;
  tokensInput: number;
  tokensOutput: number;
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
  /** 完成节点数 / 已调度节点数 */
  completionRate?: number;
  /** 已完成节点平均耗时毫秒 */
  avgNodeDurationMs?: number;
  /** 失败节点计数（与 nodesFailed 口径一致，供实例级摘要直接引用） */
  failureCount?: number;
  /** 人工干预成对计数（创建并解决） */
  humanInterventionCount?: number;
  /** 人工修改计数（人工决议 modified） */
  humanModificationCount?: number;
  /** 模型调用分布 */
  modelCalls?: ModelCallSummary[];
  /** 异常分类计数 */
  anomalyBreakdown?: Record<string, number>;
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
  private scheduledNodes = new Set<string>();
  private totalAttempts = 0;
  private readonly nodeDurations: number[] = [];
  private humanCreatedCount = 0;
  private humanInterventionCount = 0;
  private humanModificationCount = 0;
  private readonly modelCalls = new Map<string, ModelCallSummary>();
  private readonly anomalyBreakdown: Record<string, number> = {};

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
    const statPayload = (event.payload ?? {}) as Record<string, unknown>;
    switch (type) {
      case ExecutionEventType.NODE_STARTED:
        this.totalAttempts++;
        if (nodeId) this.scheduledNodes.add(nodeId);
        break;
      case ExecutionEventType.NODE_RETRYING: {
        this.totalAttempts++;
        const anomalyCode = typeof statPayload.anomalyCode === 'string' ? statPayload.anomalyCode : 'node_retrying';
        this.anomalyBreakdown[anomalyCode] = (this.anomalyBreakdown[anomalyCode] ?? 0) + 1;
        break;
      }
      case ExecutionEventType.NODE_COMPLETED: {
        if (nodeId) this.nodesExecuted.add(nodeId);
        const durationMs = typeof statPayload.durationMs === 'number' && Number.isFinite(statPayload.durationMs)
          ? statPayload.durationMs
          : undefined;
        if (durationMs !== undefined) this.nodeDurations.push(durationMs);
        if (typeof statPayload.modelId === 'string' && statPayload.modelId.trim().length > 0) {
          const existing = this.modelCalls.get(statPayload.modelId) ?? {
            modelId: statPayload.modelId,
            calls: 0,
            tokensInput: 0,
            tokensOutput: 0,
          };
          const tokens = statPayload.tokens as { input?: number; output?: number } | undefined;
          existing.calls++;
          existing.tokensInput += tokens?.input ?? 0;
          existing.tokensOutput += tokens?.output ?? 0;
          this.modelCalls.set(statPayload.modelId, existing);
        }
        if (statPayload && typeof statPayload === 'object' && 'tokens' in statPayload) {
          const t = (statPayload as { tokens?: { input?: number; output?: number } }).tokens;
          if (t) {
            this.tokens.input += t.input ?? 0;
            this.tokens.output += t.output ?? 0;
          }
        }
        break;
      }
      case ExecutionEventType.NODE_FAILED: {
        if (nodeId) this.nodesFailed.add(nodeId);
        const anomalyCode = typeof statPayload.anomalyCode === 'string' ? statPayload.anomalyCode : 'node_failed';
        this.anomalyBreakdown[anomalyCode] = (this.anomalyBreakdown[anomalyCode] ?? 0) + 1;
        break;
      }
      case ExecutionEventType.HUMAN_TASK_CREATED:
        this.humanCreatedCount++;
        break;
      case ExecutionEventType.HUMAN_TASK_RESOLVED:
        if (this.humanCreatedCount > 0) this.humanInterventionCount++;
        if (statPayload.humanAction === 'modified') this.humanModificationCount++;
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
    const completed = this.nodesExecuted.size;
    const scheduled = Math.max(this.scheduledNodes.size, completed);
    const avgNodeDurationMs = this.nodeDurations.length > 0
      ? Math.round((this.nodeDurations.reduce((sum, value) => sum + value, 0) / this.nodeDurations.length) * 10) / 10
      : undefined;
    return {
      instanceId: this.instanceId,
      workflowId: this.workflowId,
      status,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      durationMs: (this.finishedAt ?? Date.now()) - this.startedAt,
      nodesExecuted: completed,
      nodesFailed: this.nodesFailed.size,
      totalAttempts: this.totalAttempts,
      tokens: { ...this.tokens },
      completionRate: scheduled > 0 ? Math.round((completed / scheduled) * 1000) / 1000 : 0,
      avgNodeDurationMs,
      failureCount: this.nodesFailed.size,
      humanInterventionCount: this.humanInterventionCount,
      humanModificationCount: this.humanModificationCount,
      modelCalls: Array.from(this.modelCalls.values()).sort((a, b) => a.modelId.localeCompare(b.modelId)),
      anomalyBreakdown: { ...this.anomalyBreakdown },
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
