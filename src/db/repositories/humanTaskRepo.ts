/**
 * 健澜科技 jlmedaios - 人工任务 Repository（M4-D）
 *
 * 持久化 agent.human_tasks：工作流执行到 human 节点（或高风险节点强制人工）
 * 时创建审核/确认工单，实例进入 waiting_human；审核人认领并批准/驳回后，
 * 工作流继续或终止。
 *
 * 安全要点：
 *  - 工单与运行实例外键级联（instance_id ON DELETE CASCADE）；
 *  - 认领/处理为条件式更新（status 校验 + 行锁），防止重复处置；
 *  - review_data 仅存已脱敏的审核上下文，不写入患者敏感标识。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb, type DbExecutor } from '../pool.js';

// ============================================================================
// 类型
// ============================================================================

/** 人工任务视图 */
export interface HumanTaskRecord {
  id: string;
  taskNo: string;
  instanceId: string;
  nodeId: string;
  title: string;
  instructions: string | null;
  assigneeRoles: string[];
  assigneeUsers: string[];
  formSchema: Record<string, unknown>;
  reviewData: unknown;
  status: string;
  resolution: {
    approved?: boolean;
    formData?: Record<string, unknown>;
    reviewerId?: string;
    comment?: string;
  } | null;
  claimedBy: string | null;
  resolvedBy: string | null;
  dueAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
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

/** 生成人工工单号：HT + 日期 + 6 位随机 */
function genTaskNo(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `HT${date}${suffix}`;
}

// ============================================================================
// 创建 / 查询
// ============================================================================

/** 创建人工工单（幂等：同一 instance + node 已存在则回查） */
export async function insertHumanTask(
  input: {
    instanceId: string;
    nodeId: string;
    title: string;
    instructions?: string | null;
    assigneeRoles: string[];
    assigneeUsers?: string[];
    formSchema?: Record<string, unknown>;
    reviewData?: unknown;
    dueAt?: string | null;
  },
  exec?: DbExecutor,
): Promise<HumanTaskRecord> {
  const db = exec ?? getDb();
  // 幂等：重试场景下同 instance + node 已有 pending/claimed 工单则直接回查
  const existing = await db`
    SELECT * FROM agent.human_tasks
    WHERE instance_id = ${input.instanceId} AND node_id = ${input.nodeId}
      AND status IN ('pending','claimed')
    LIMIT 1
  `;
  if (existing.length) return mapHumanTask(existing[0]);

  const rows = await db`
    INSERT INTO agent.human_tasks (
      id, task_no, instance_id, node_id, title, instructions,
      assignee_roles, assignee_users, form_schema, review_data, status, due_at
    ) VALUES (
      ${randomUUID()}, ${genTaskNo()}, ${input.instanceId}, ${input.nodeId},
      ${input.title}, ${input.instructions ?? null},
      ${input.assigneeRoles}::jsonb, ${input.assigneeUsers ?? []}::jsonb,
      ${input.formSchema ?? {}}::jsonb, ${input.reviewData ?? null}::jsonb,
      'pending', ${input.dueAt ?? null}
    )
    RETURNING *
  `;
  return mapHumanTask(rows[0]);
}

/** 按主键获取工单 */
export async function getHumanTaskById(
  id: string,
  exec?: DbExecutor,
): Promise<HumanTaskRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    SELECT * FROM agent.human_tasks WHERE id = ${id} LIMIT 1
  `;
  return rows.length ? mapHumanTask(rows[0]) : null;
}

/**
 * 列出工单（按状态 + 审核人角色/用户过滤）。
 * 工单命中规则：assignee_roles 与当前角色有交集，或 assignee_users 包含当前用户。
 */
export async function listHumanTasks(
  filter: {
    status?: string;
    roles?: string[];
    userId?: string;
    instanceId?: string;
    limit?: number;
  } = {},
  exec?: DbExecutor,
): Promise<HumanTaskRecord[]> {
  const db = exec ?? getDb();
  const limit = filter.limit ?? 100;
  const rows = await db`
    SELECT * FROM agent.human_tasks t
    WHERE (${filter.status ?? 'pending'}::text IS NULL OR t.status = ${filter.status ?? 'pending'})
      AND (${filter.instanceId ?? null}::uuid IS NULL OR t.instance_id = ${filter.instanceId ?? null})
      AND (
        ${filter.roles ?? null}::jsonb IS NULL
        OR t.assignee_roles ?| ${filter.roles ?? []}
        OR (${filter.userId ?? null}::text IS NOT NULL AND t.assignee_users ?| ${filter.userId ? [filter.userId] : []})
      )
    ORDER BY t.created_at ASC
    LIMIT ${limit}
  `;
  return rows.map(mapHumanTask);
}

// ============================================================================
// 认领 / 处理 / 取消
// ============================================================================

/**
 * 认领工单（pending → claimed）。
 * 条件式更新：仅 pending 可认领，返回是否成功。
 */
export async function claimHumanTask(
  id: string,
  userId: string,
  exec?: DbExecutor,
): Promise<HumanTaskRecord | null> {
  const db = exec ?? getDb();
  const rows = await db`
    UPDATE agent.human_tasks
    SET status = 'claimed', claimed_by = ${userId}
    WHERE id = ${id} AND status = 'pending'
    RETURNING *
  `;
  return rows.length ? mapHumanTask(rows[0]) : null;
}

/**
 * 处理工单（pending/claimed → resolved），记录审核人、结论与意见。
 * 条件式更新：仅 pending/claimed 可处理，返回更新后的工单（null 表示状态不允许）。
 */
export async function resolveHumanTask(
  id: string,
  input: {
    approved: boolean;
    reviewerId: string;
    comment?: string;
    formData?: Record<string, unknown>;
  },
  exec?: DbExecutor,
): Promise<HumanTaskRecord | null> {
  const db = exec ?? getDb();
  const resolution = {
    approved: input.approved,
    reviewerId: input.reviewerId,
    comment: input.comment ?? null,
    formData: input.formData ?? null,
  };
  const rows = await db`
    UPDATE agent.human_tasks
    SET status = 'resolved',
        resolved_by = ${input.reviewerId},
        resolved_at = now(),
        resolution = ${resolution}::jsonb
    WHERE id = ${id} AND status IN ('pending','claimed')
    RETURNING *
  `;
  return rows.length ? mapHumanTask(rows[0]) : null;
}

/** 实例取消时，把该实例未完成工单置为 cancelled */
export async function cancelOpenTasksByInstance(
  instanceId: string,
  exec?: DbExecutor,
): Promise<void> {
  const db = exec ?? getDb();
  await db`
    UPDATE agent.human_tasks
    SET status = 'cancelled'
    WHERE instance_id = ${instanceId} AND status IN ('pending','claimed')
  `;
}

/** 实例整体超时（未在时限内处理）时，把该实例未完成工单置为 timeout */
export async function timeoutOpenTasksByInstance(
  instanceId: string,
  exec?: DbExecutor,
): Promise<void> {
  const db = exec ?? getDb();
  await db`
    UPDATE agent.human_tasks
    SET status = 'timeout'
    WHERE instance_id = ${instanceId} AND status IN ('pending','claimed')
  `;
}

// ============================================================================
// 行映射
// ============================================================================

function mapHumanTask(row: Record<string, unknown>): HumanTaskRecord {
  return {
    id: String(row.id),
    taskNo: String(row.task_no),
    instanceId: String(row.instance_id),
    nodeId: String(row.node_id),
    title: String(row.title),
    instructions: row.instructions != null ? String(row.instructions) : null,
    assigneeRoles: parseJsonb<string[]>(row.assignee_roles, []),
    assigneeUsers: parseJsonb<string[]>(row.assignee_users, []),
    formSchema: parseJsonb<Record<string, unknown>>(row.form_schema, {}),
    reviewData: row.review_data ?? null,
    status: String(row.status),
    resolution: parseJsonb<HumanTaskRecord['resolution']>(row.resolution, null),
    claimedBy: row.claimed_by != null ? String(row.claimed_by) : null,
    resolvedBy: row.resolved_by != null ? String(row.resolved_by) : null,
    dueAt: row.due_at != null ? String(row.due_at) : null,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
  };
}
