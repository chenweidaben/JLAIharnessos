/**
 * 健澜AI原生医院操作系统OS - 断点快照协议（阶段①进程内存实现）
 *
 * 节点边界自动快照；跨会话按 instanceId + patientId/visitId 定位最近快照；
 * 仅合法状态可续跑；快照内容经脱敏并与四维版本绑定归档。
 * 本文件不依赖数据库，后续接持久化仓储只替换 SnapshotStore 实现。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { desensitizeText } from '@/security/desensitization/index.js';
import type { AiVersionSnapshot } from '@/security/audit/aiAudit.js';
import { WorkflowState } from '../dsl/types.js';
import { IllegalStateTransitionError } from './state.js';
import type { NodeRecord, WorkflowContext } from './context.js';

/** 长住院关键节点标识（诊断变更/手术/危急值/过敏/输血/抢救等） */
export interface TimelineMarker {
  /** 关键节点类型键 */
  key: string;
  /** 事件摘要 */
  event: string;
  /** 发生时间 ISO */
  timestamp: string;
  /** 事件来源节点或工具 */
  source?: string;
  /** 附加结构化详情（纯 JSON 安全数据） */
  details?: Record<string, unknown>;
}

/** 运行上下文快照（纯 JSON 可序列化） */
export interface RuntimeContextSnapshot {
  vars: Record<string, unknown>;
  input: Record<string, unknown>;
  patient: Record<string, unknown>;
  user: Record<string, unknown>;
  messages?: unknown[];
  lastOutputs: Record<string, unknown>;
  attachments?: unknown[];
  summary?: string;
  keyNodes?: TimelineMarker[];
}

/** 断点状态快照 */
export interface StateSnapshot {
  instanceId: string;
  workflowId: string;
  workflowVersion: string;
  state: WorkflowState;
  currentNodeId: string | null;
  completedNodes: Record<string, NodeRecord>;
  context: RuntimeContextSnapshot;
  pendingHumanTasks: string[];
  versions: AiVersionSnapshot;
  savedAt: string;
  traceId: string;
  patientId?: string;
  visitId?: string;
  snapshotFormatVersion: '1.0.0';
  desensitized: boolean;
  keyNodes?: TimelineMarker[];
}

/** 快照检索条件 */
export interface SnapshotQuery {
  instanceId?: string;
  patientId?: string;
  visitId?: string;
}

/** 快照仓储接口（内存实现先行，DB 实现后续仅替换本接口） */
export interface SnapshotStore {
  save(snapshot: StateSnapshot): StateSnapshot;
  findLatest(query: SnapshotQuery): StateSnapshot | undefined;
  list(query: SnapshotQuery): StateSnapshot[];
  remove(instanceId: string): void;
  clear(): void;
}

/** 构造快照所需依赖 */
export interface BuildSnapshotDeps {
  instanceId: string;
  workflowId: string;
  workflowVersion: string;
  state: WorkflowState;
  currentNodeId: string | null;
  completedNodes: Record<string, NodeRecord>;
  context: RuntimeContextSnapshot | WorkflowContext;
  pendingHumanTasks: string[];
  versions: AiVersionSnapshot;
  traceId: string;
  patientId?: string;
  visitId?: string;
  keyNodes?: TimelineMarker[];
}

const isWorkflowContext = (value: unknown): value is WorkflowContext =>
  typeof value === 'object' && value !== null && typeof (value as WorkflowContext).snapshot === 'function';

function plainClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function rejectUnsafe(value: unknown, path: string, seen: Set<unknown>): void {
  if (value === null || value === undefined) return;
  if (value instanceof Map || value instanceof Set) {
    throw new Error(`快照包含不可序列化容器: ${path}`);
  }
  if (typeof value === 'function') throw new Error(`快照包含函数: ${path}`);
  if (value instanceof Date) throw new Error(`快照包含 Date 对象: ${path}`);
  if (typeof value !== 'object') return;
  if (seen.has(value)) throw new Error(`快照存在循环引用: ${path}`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectUnsafe(item, `${path}[${index}]`, seen));
  } else {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      rejectUnsafe(child, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

function desensitizePlain(value: unknown, seen: Set<unknown> = new Set()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return desensitizeText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Map || value instanceof Set || typeof value === 'function') return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => desensitizePlain(item, seen));
  }
  if (value instanceof Date) return value.toISOString();
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    output[key] = desensitizePlain(child, seen);
  }
  seen.delete(value);
  return output;
}

function extractRuntimeContext(
  source: RuntimeContextSnapshot | WorkflowContext,
  completedNodes: Record<string, NodeRecord>,
): RuntimeContextSnapshot {
  if (isWorkflowContext(source)) {
    const raw = source.snapshot() as Record<string, unknown>;
    const records = Array.isArray(raw.records) ? raw.records : [];
    const lastOutputs: Record<string, unknown> = {};
    for (const record of records as NodeRecord[]) {
      lastOutputs[record.nodeId] = record.output;
    }
    return {
      input: (raw.input as Record<string, unknown>) ?? {},
      vars: (raw.vars as Record<string, unknown>) ?? {},
      patient: (raw.patient as Record<string, unknown>) ?? {},
      user: (raw.user as Record<string, unknown>) ?? {},
      lastOutputs,
    };
  }
  const lastOutputs: Record<string, unknown> = {};
  for (const [nodeId, record] of Object.entries(completedNodes)) {
    lastOutputs[nodeId] = record.output;
  }
  return {
    input: source.input ?? {},
    vars: source.vars ?? {},
    patient: source.patient ?? {},
    user: source.user ?? {},
    messages: source.messages,
    lastOutputs: { ...lastOutputs, ...source.lastOutputs },
    attachments: source.attachments,
    summary: source.summary,
    keyNodes: source.keyNodes,
  };
}

/** 构造并脱敏快照；versions 四维版本随快照绑定归档 */
export function buildStateSnapshot(deps: BuildSnapshotDeps): StateSnapshot {
  const rawContext = extractRuntimeContext(deps.context, deps.completedNodes);
  const context = desensitizePlain({
    input: rawContext.input,
    vars: rawContext.vars,
    patient: rawContext.patient,
    user: rawContext.user,
    messages: rawContext.messages,
    lastOutputs: rawContext.lastOutputs,
    attachments: rawContext.attachments,
    summary: rawContext.summary,
    keyNodes: rawContext.keyNodes,
  }) as RuntimeContextSnapshot;

  const completedNodes: Record<string, NodeRecord> = {};
  for (const [nodeId, record] of Object.entries(deps.completedNodes)) {
    completedNodes[nodeId] = {
      nodeId: record.nodeId,
      state: record.state,
      output: desensitizePlain(record.output),
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      durationMs: record.durationMs,
      attempts: record.attempts,
      error: typeof record.error === 'string' ? desensitizeText(record.error) : record.error,
      tokens: record.tokens ? plainClone(record.tokens) : record.tokens,
    };
  }

  const snapshot: StateSnapshot = {
    instanceId: deps.instanceId,
    workflowId: deps.workflowId,
    workflowVersion: deps.workflowVersion,
    state: deps.state,
    currentNodeId: deps.currentNodeId,
    completedNodes,
    context,
    pendingHumanTasks: deps.pendingHumanTasks.map((task) => desensitizeText(task)),
    versions: plainClone(deps.versions),
    savedAt: new Date().toISOString(),
    traceId: deps.traceId,
    patientId: deps.patientId,
    visitId: deps.visitId,
    snapshotFormatVersion: '1.0.0',
    desensitized: true,
    keyNodes: deps.keyNodes?.map((node) => ({ ...node, event: desensitizeText(node.event) })),
  };
  return plainClone(snapshot);
}

/** 序列化为纯 JSON 安全字符串；拒绝函数/Map/Set/循环引用 */
export function serializeSnapshot(snapshot: StateSnapshot): string {
  rejectUnsafe(snapshot, 'snapshot', new Set());
  return JSON.stringify(snapshot);
}

/** 从 JSON 字符串反序列化并深拷贝快照 */
export function deserializeSnapshot(text: string): StateSnapshot {
  const parsed = JSON.parse(text) as StateSnapshot;
  rejectUnsafe(parsed, 'snapshot', new Set());
  return plainClone(parsed);
}

/**
 * 快照续跑状态迁移校验。
 * 阶段①口径：WAITING_HUMAN / PAUSED / FAILED 可迁入 RUNNING；
 * COMPLETED / CANCELLED 为终态拒绝续跑。FAILED 对应失败待重试边界，
 * 与 WorkflowStateMachine 的修复后重跑方向在编排层单独包装。
 */
export function validateSnapshotTransition(snapshot: StateSnapshot, targetState: WorkflowState): void {
  const terminalStates = new Set<WorkflowState>([WorkflowState.COMPLETED, WorkflowState.CANCELLED]);
  const resumableStates = new Set<WorkflowState>([
    WorkflowState.WAITING_HUMAN,
    WorkflowState.PAUSED,
    WorkflowState.FAILED,
  ]);
  if (terminalStates.has(snapshot.state)) {
    throw new IllegalStateTransitionError(snapshot.state, targetState);
  }
  if (targetState !== WorkflowState.RUNNING || !resumableStates.has(snapshot.state)) {
    throw new IllegalStateTransitionError(snapshot.state, targetState);
  }
}

/** 将快照上下文回填进既有上下文；不重新执行已完成节点、不重放工具调用 */
export function hydrateContext(ctx: WorkflowContext, snapshot: StateSnapshot): WorkflowContext {
  ctx.restoreInput(snapshot.context.input ?? {});
  ctx.restoreActorContext(snapshot.context.patient ?? {}, snapshot.context.user ?? {});
  ctx.mergeVariables(snapshot.context.vars ?? {});
  ctx.restoreCompletedRecords(snapshot.completedNodes ?? {});
  ctx.restorePendingHumanTasks(snapshot.pendingHumanTasks ?? []);
  return ctx;
}

/** 进程内存快照仓储：Map + 按 savedAt 排序；后续接 DB 仅替换本接口实现 */
export class InMemorySnapshotStore implements SnapshotStore {
  private readonly byInstance = new Map<string, StateSnapshot>();
  private readonly all: StateSnapshot[] = [];

  save(snapshot: StateSnapshot): StateSnapshot {
    const cloned = plainClone(snapshot);
    this.byInstance.set(cloned.instanceId, cloned);
    const existingIndex = this.all.findIndex((item) => item.instanceId === cloned.instanceId);
    if (existingIndex >= 0) {
      this.all[existingIndex] = cloned;
    } else {
      this.all.push(cloned);
    }
    return plainClone(cloned);
  }

  findLatest(query: SnapshotQuery): StateSnapshot | undefined {
    const matches = this.matchQuery(query);
    matches.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    return matches[0] ? plainClone(matches[0]) : undefined;
  }

  list(query: SnapshotQuery): StateSnapshot[] {
    const matches = this.matchQuery(query);
    matches.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
    return matches.map((item) => plainClone(item));
  }

  remove(instanceId: string): void {
    this.byInstance.delete(instanceId);
    const index = this.all.findIndex((item) => item.instanceId === instanceId);
    if (index >= 0) this.all.splice(index, 1);
  }

  clear(): void {
    this.byInstance.clear();
    this.all.length = 0;
  }

  private matchQuery(query: SnapshotQuery): StateSnapshot[] {
    return this.all.filter((item) => {
      if (query.instanceId && item.instanceId !== query.instanceId) return false;
      if (query.patientId && item.patientId !== query.patientId) return false;
      if (query.visitId && item.visitId !== query.visitId) return false;
      return true;
    });
  }
}
