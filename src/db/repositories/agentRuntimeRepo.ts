/**
 * 健澜科技 jlmedaios - 智能体运行时 Repository（M4-C）
 *
 * 持久化 agent.workflow_instances / agent.workflow_node_records / agent.agent_invocations，
 * 支撑已发布智能体的执行、节点级运行记录、用量留痕与结果回放。
 *
 * 记录模型：
 *  - 执行开始即插入一条 workflow_instances（state=running），保证即使执行进程
 * *    异常中断，也留有运行痕迹（不会出现"跑了但无记录"）；
 *  - 节点执行通过 ExecutionRecorder 的事件，按节点 upsert workflow_node_records；
 *  - 执行结束回写实例终态（completed/failed/cancelled，output/error/tokens/duration），
 *    并写一条 agent_invocations 用量日志。
 *
 * 所有函数接受可选事务句柄，保证实例终态、节点记录与审计同提交同回滚。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb, type DbExecutor } from '../pool.js';

// ============================================================================
// 类型
// ============================================================================

/** 工作流实例视图 */
export interface WorkflowInstanceRecord {
  id: string;
  instanceNo: string;
  agentId: string;
  agentVersion: string | null;
  workflowId: string;
  state: string;
  triggerType: string | null;
  traceId: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  contextVars: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
  actorId: string | null;
  patientRef: string | null;
  tokensIn: number;
  tokensOut: number;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

/** 节点执行记录视图 */
export interface NodeRecord {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeType: string;
  state: string;
  attempts: number;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
}

/** 智能体调用日志视图 */
export interface InvocationRecord {
  id: string;
  traceId: string | null;
  agentId: string;
  agentVersion: string | null;
  actorId: string | null;
  triggerType: string | null;
  status: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number | null;
  errorCode: string | null;
  createdAt: string;
}

function parseJsonb<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

/** 生成运行实例号：WIN + 日期 + 6 位随机（与既有业务单号风格一致） */
function genInstanceNo(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `WIN${date}${suffix}`;
}

// ============================================================================
// workflow_instances
// ============================================================================

/** 执行开始：创建运行中实例 */
export async function insertRunningInstance(
  input: {
    agentId: string;
    agentVersion: string;
    workflowId: string;
    triggerType: string;
    traceId: string;
    input: Record<string, unknown>;
    actorId: string | null;
    patientRef?: string | null;
  },
  exec?: DbExecutor,
): Promise<WorkflowInstanceRecord> {
  const db = exec ?? getDb();
  const rows = await db`
    INSERT INTO agent.workflow_instances (
      id, instance_no, agent_id, agent_version, workflow_id, state,
      trigger_type, trace_id, input, context_vars, actor_id, patient_ref
    ) VALUES (
      ${randomUUID()}, ${genInstanceNo()}, ${input.agentId}, ${input.agentVersion},
      ${input.workflowId}, 'running', ${input.triggerType}, ${input.traceId},
      ${input.input}::jsonb, '{}'::jsonb, ${input.actorId}, ${input.patientRef ?? null}
    )
    RETURNING *
  `;
  return mapInstance(rows[0]);
}

/** 执行结束：回写终态 */
export async function updateInstanceTerminal(
  instanceId: string,
  patch: {
    state: string;
    output?: Record<string, unknown> | null;
    contextVars?: Record<string, unknown>;
    errorCode?: string | null;
    errorMessage?: string | null;
    tokensIn?: number;
    tokensOut?: number;
    durationMs?: number;
  },
  exec?: DbExecutor,
): Promise<void> {
  const db = exec ?? getDb();
  await db`
    UPDATE agent.workflow_instances SET
      state = ${patch.state},
      output = ${patch.output ?? null}::jsonb,
      context_vars = ${patch.contextVars ?? {}}::jsonb,
      error_code = ${patch.errorCode ?? null},
      error_message = ${patch.errorMessage ?? null},
      tokens_in = ${patch.tokensIn ?? 0},
      tokens_out = ${patch.tokensOut ?? 0},
      finished_at = now(),
      duration_ms = ${patch.durationMs ?? null}
    WHERE id = ${instanceId}
  `;
}

/** 列出实例（可按 agentId / state 过滤，按开始时间倒序） */
export async function listInstances(
  filter: { agentId?: string; state?: string; limit?: number } = {},
  exec?: DbExecutor,
): Promise<WorkflowInstanceRecord[]> {
  const db = exec ?? getDb();
  const limit = filter.limit ?? 100;
  const rows = filter.agentId
    ? await db`
        SELECT * FROM agent.workflow_instances
        WHERE agent_id = ${filter.agentId}
          AND (${filter.state ?? null}::text IS NULL OR state = ${filter.state ?? null})
        ORDER BY started_at DESC
        LIMIT ${limit}
      `
    : await db`
        SELECT * FROM agent.workflow_instances
        WHERE (${filter.state ?? null}::text IS NULL OR state = ${filter.state ?? null})
        ORDER BY started_at DESC
        LIMIT ${limit}
      `;
  return rows.map(mapInstance);
}

/** 按主键获取实例 */
export async function getInstanceById(
  instanceId: string,
  exec?: DbExecutor,
): Promise<WorkflowInstanceRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.workflow_instances WHERE id = ${instanceId} LIMIT 1
  `;
  return rows.length ? mapInstance(rows[0]) : null;
}

// ============================================================================
// workflow_node_records
// ============================================================================

/** Upsert 节点执行记录（instance_id + node_id 唯一） */
export async function upsertNodeRecord(
  input: {
    instanceId: string;
    nodeId: string;
    nodeType: string;
    state: string;
    attempts: number;
    input?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    durationMs?: number | null;
  },
  exec?: DbExecutor,
): Promise<void> {
  const db = exec ?? getDb();
  await db`
    INSERT INTO agent.workflow_node_records (
      id, instance_id, node_id, node_type, state, attempts,
      input, output, error_code, error_message, started_at, finished_at, duration_ms
    ) VALUES (
      ${randomUUID()}, ${input.instanceId}, ${input.nodeId}, ${input.nodeType},
      ${input.state}, ${input.attempts},
      ${input.input ?? null}::jsonb, ${input.output ?? null}::jsonb,
      ${input.errorCode ?? null}, ${input.errorMessage ?? null},
      now(), CASE WHEN ${input.state} IN ('completed','failed','skipped','cancelled')
        THEN now() ELSE NULL END,
      ${input.durationMs ?? null}
    )
    ON CONFLICT (instance_id, node_id) DO UPDATE SET
      node_type = EXCLUDED.node_type,
      state = EXCLUDED.state,
      attempts = EXCLUDED.attempts,
      input = COALESCE(EXCLUDED.input, agent.workflow_node_records.input),
      output = COALESCE(EXCLUDED.output, agent.workflow_node_records.output),
      error_code = EXCLUDED.error_code,
      error_message = EXCLUDED.error_message,
      finished_at = CASE WHEN EXCLUDED.state IN
        ('completed','failed','skipped','cancelled') THEN now()
        ELSE agent.workflow_node_records.finished_at END,
      duration_ms = EXCLUDED.duration_ms
  `;
}

/** 列出实例的节点记录（按节点开始时间） */
export async function listNodeRecords(
  instanceId: string,
  exec?: DbExecutor,
): Promise<NodeRecord[]> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.workflow_node_records
    WHERE instance_id = ${instanceId}
    ORDER BY started_at ASC
  `;
  return rows.map(mapNodeRecord);
}

// ============================================================================
// agent_invocations
// ============================================================================

/** 写入调用日志 */
export async function insertInvocation(
  input: {
    traceId: string;
    agentId: string;
    agentVersion: string;
    actorId: string | null;
    triggerType: string;
    status: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    errorCode?: string | null;
  },
  exec?: DbExecutor,
): Promise<InvocationRecord> {
  const db = exec ?? getDb();
  const rows = await db`
    INSERT INTO agent.agent_invocations (
      id, trace_id, agent_id, agent_version, actor_id, trigger_type,
      status, tokens_in, tokens_out, latency_ms, error_code
    ) VALUES (
      ${randomUUID()}, ${input.traceId}, ${input.agentId}, ${input.agentVersion},
      ${input.actorId}, ${input.triggerType}, ${input.status},
      ${input.tokensIn}, ${input.tokensOut}, ${input.latencyMs},
      ${input.errorCode ?? null}
    )
    RETURNING *
  `;
  return mapInvocation(rows[0]);
}

// ============================================================================
// 行映射
// ============================================================================

function mapInstance(row: Record<string, unknown>): WorkflowInstanceRecord {
  return {
    id: String(row.id),
    instanceNo: String(row.instance_no),
    agentId: String(row.agent_id),
    agentVersion: row.agent_version != null ? String(row.agent_version) : null,
    workflowId: String(row.workflow_id),
    state: String(row.state),
    triggerType: row.trigger_type != null ? String(row.trigger_type) : null,
    traceId: row.trace_id != null ? String(row.trace_id) : null,
    input: parseJsonb<Record<string, unknown>>(row.input, {}),
    output: parseJsonb<Record<string, unknown> | null>(row.output, null),
    contextVars: parseJsonb<Record<string, unknown>>(row.context_vars, {}),
    errorCode: row.error_code != null ? String(row.error_code) : null,
    errorMessage: row.error_message != null ? String(row.error_message) : null,
    actorId: row.actor_id != null ? String(row.actor_id) : null,
    patientRef: row.patient_ref != null ? String(row.patient_ref) : null,
    tokensIn: Number(row.tokens_in ?? 0),
    tokensOut: Number(row.tokens_out ?? 0),
    startedAt: String(row.started_at),
    finishedAt: row.finished_at != null ? String(row.finished_at) : null,
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
  };
}

function mapNodeRecord(row: Record<string, unknown>): NodeRecord {
  return {
    id: String(row.id),
    instanceId: String(row.instance_id),
    nodeId: String(row.node_id),
    nodeType: String(row.node_type),
    state: String(row.state),
    attempts: Number(row.attempts ?? 0),
    input: parseJsonb<Record<string, unknown> | null>(row.input, null),
    output: parseJsonb<Record<string, unknown> | null>(row.output, null),
    errorCode: row.error_code != null ? String(row.error_code) : null,
    errorMessage: row.error_message != null ? String(row.error_message) : null,
    startedAt: row.started_at != null ? String(row.started_at) : null,
    finishedAt: row.finished_at != null ? String(row.finished_at) : null,
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
  };
}

function mapInvocation(row: Record<string,unknown>): InvocationRecord {
  return {
    id: String(row.id),
    traceId: row.trace_id != null ? String(row.trace_id) : null,
    agentId: String(row.agent_id),
    agentVersion: row.agent_version != null ? String(row.agent_version) : null,
    actorId: row.actor_id != null ? String(row.actor_id) : null,
    triggerType: row.trigger_type != null ? String(row.trigger_type) : null,
    status: String(row.status),
    tokensIn: Number(row.tokens_in ?? 0),
    tokensOut: Number(row.tokens_out ?? 0),
    latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
    errorCode: row.error_code != null ? String(row.error_code) : null,
    createdAt: String(row.created_at),
  };
}
