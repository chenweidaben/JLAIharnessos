/**
 * 健澜科技 jlmedaios - 整改升级 repo（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface EscalatedTask {
  id: string; parentTaskId: string | null; escalationLevel: number; title: string; assigneeId: string; status: string;
}

function map(r: Record<string, unknown>): EscalatedTask {
  return {
    id: String(r.id),
    parentTaskId: r.parent_task_id == null ? null : String(r.parent_task_id),
    escalationLevel: Number(r.escalation_level),
    title: String(r.title), assigneeId: String(r.assignee_id), status: String(r.status),
  };
}

/** 按 parent_task_id 去重查最新升级单。 */
export async function getLatestEscalation(parentTaskId: string, tx: DbExecutor = db): Promise<EscalatedTask | null> {
  const rows = await tx`
    SELECT id, parent_task_id, escalation_level, title, assignee_id, status
    FROM clinical.clinical_improvement_tasks
    WHERE parent_task_id=${parentTaskId}
    ORDER BY escalation_level DESC LIMIT 1`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** 创建升级单。 */
export async function createEscalatedTask(
  input: { parentTaskId: string; escalationLevel: number; title: string; finding: string; assigneeId: string; createdBy: string; source?: string },
  tx: DbExecutor = db,
): Promise<EscalatedTask> {
  const rows = await tx`
    INSERT INTO clinical.clinical_improvement_tasks (source, visit_id, group_code, category, title, finding, assignee_id, escalation_level, parent_task_id, created_by)
    VALUES (${input.source ?? 'drg_attribution'}, NULL, NULL, NULL, ${input.title}, ${input.finding}, ${input.assigneeId}, ${input.escalationLevel}, ${input.parentTaskId}, ${input.createdBy})
    RETURNING id, parent_task_id, escalation_level, title, assignee_id, status`;
  return map(rows[0] as Record<string, unknown>);
}

/** 升级链：取 parent + 所有子单。 */
export async function getChain(rootId: string): Promise<EscalatedTask[]> {
  const rows = await db`
    WITH RECURSIVE chain AS (
      SELECT id, parent_task_id, escalation_level, title, assignee_id, status, created_at
      FROM clinical.clinical_improvement_tasks WHERE id=${rootId}
      UNION ALL
      SELECT t.id, t.parent_task_id, t.escalation_level, t.title, t.assignee_id, t.status, t.created_at
      FROM clinical.clinical_improvement_tasks t JOIN chain ON t.parent_task_id = chain.id
    )
    SELECT id, parent_task_id, escalation_level, title, assignee_id, status FROM chain ORDER BY escalation_level`;
  return rows.map((r) => map(r as Record<string, unknown>));
}
