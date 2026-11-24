/**
 * 健澜科技 jlmedaios - 临床改进任务 repo（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface TaskRow {
  id: string; source: string; visitId: string | null; patientId: string | null; groupCode: string | null; category: string | null;
  title: string; finding: string; assigneeId: string; status: string;
  dueDate: string | null; resolutionNote: string | null; createdAt: string;
}

function map(r: Record<string, unknown>): TaskRow {
  return {
    id: String(r.id), source: String(r.source),
    visitId: r.visit_id == null ? null : String(r.visit_id),
    patientId: r.patient_id == null ? null : String(r.patient_id),
    groupCode: r.group_code == null ? null : String(r.group_code),
    category: r.category == null ? null : String(r.category),
    title: String(r.title), finding: String(r.finding),
    assigneeId: String(r.assignee_id), status: String(r.status),
    dueDate: r.due_date == null ? null : String(r.due_date),
    resolutionNote: r.resolution_note == null ? null : String(r.resolution_note),
    createdAt: String(r.created_at),
  };
}

const ROW_COLS = `id, source, visit_id, patient_id, group_code, category, title, finding, assignee_id, status, due_date, resolution_note, created_at`;

export async function createTask(
  input: { source?: string; visitId?: string | null; patientId?: string | null; groupCode?: string | null; category?: string | null; title: string; finding: string; assigneeId: string; dueDate?: string | null; createdBy: string },
  tx: DbExecutor = db,
): Promise<TaskRow> {
  const rows = await tx`
    INSERT INTO clinical.clinical_improvement_tasks (source, visit_id, patient_id, group_code, category, title, finding, assignee_id, due_date, created_by)
    VALUES (${input.source ?? 'drg_attribution'}, ${input.visitId ?? null}, ${input.patientId ?? null}, ${input.groupCode ?? null}, ${input.category ?? null}, ${input.title}, ${input.finding}, ${input.assigneeId}, ${input.dueDate ?? null}, ${input.createdBy})
    RETURNING ${db.unsafe(ROW_COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function listByAssignee(assigneeId: string): Promise<TaskRow[]> {
  const rows = await db`
    SELECT ${db.unsafe(ROW_COLS)}
    FROM clinical.clinical_improvement_tasks WHERE assignee_id=${assigneeId} ORDER BY created_at DESC LIMIT 200`;
  return rows.map((r) => map(r as Record<string, unknown>));
}

export async function listBySource(source: string): Promise<TaskRow[]> {
  const rows = await db`
    SELECT ${db.unsafe(ROW_COLS)}
    FROM clinical.clinical_improvement_tasks WHERE source=${source} ORDER BY created_at DESC LIMIT 200`;
  return rows.map((r) => map(r as Record<string, unknown>));
}

export async function getTask(id: string, tx: DbExecutor = db): Promise<TaskRow | null> {
  const rows = await tx`
    SELECT ${db.unsafe(ROW_COLS)}
    FROM clinical.clinical_improvement_tasks WHERE id=${id}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** 幂等：查某主体在某 source 下是否已有 open/accepted/in_progress 工单。
 *  by='visit'（默认）按 visit_id 查重；by='patient' 按 patient_id 查重（无就诊上下文的患者级工单）。 */
export async function hasOpenTask(
  subject: string, source: string, tx: DbExecutor = db, opts?: { by?: 'visit' | 'patient' },
): Promise<boolean> {
  const col = opts?.by === 'patient' ? 'patient_id' : 'visit_id';
  const rows = await tx`
    SELECT 1 FROM clinical.clinical_improvement_tasks
    WHERE ${db.unsafe(col)}=${subject} AND source=${source}
      AND status IN ('open','accepted','in_progress')
    LIMIT 1`;
  return rows.length > 0;
}

/** CAS：仅当前状态 = expectedFrom 才转。0 行即冲突。 */
export async function transitionStatus(
  id: string, to: string, expectedFrom: string, resolutionNote: string | null,
  tx: DbExecutor = db,
): Promise<TaskRow | null> {
  const rows = to === 'resolved'
    ? await tx`
      UPDATE clinical.clinical_improvement_tasks
      SET status=${to}, resolution_note=${resolutionNote ?? null}, resolved_at=now()
      WHERE id=${id} AND status=${expectedFrom}
      RETURNING ${db.unsafe(ROW_COLS)}`
    : await tx`
      UPDATE clinical.clinical_improvement_tasks
      SET status=${to}, resolution_note=${resolutionNote ?? null}
      WHERE id=${id} AND status=${expectedFrom}
      RETURNING ${db.unsafe(ROW_COLS)}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
