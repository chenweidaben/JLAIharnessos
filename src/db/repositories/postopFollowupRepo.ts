/**
 * 健澜科技 jlmedaios - 术后镇痛随访 repo（M31-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Followup {
  id: string; visitId: string; timepoint: string; dueAt: string;
  completedAt: string | null; painScore: number | null; workOrderId: string | null;
  createdAt: string;
}
const COLS = `id, visit_id, timepoint, due_at, completed_at, pain_score, work_order_id, created_at`;
function map(r: Record<string, unknown>): Followup {
  return {
    id: String(r.id), visitId: String(r.visit_id), timepoint: String(r.timepoint),
    dueAt: String(r.due_at), completedAt: r.completed_at ? String(r.completed_at) : null,
    painScore: r.pain_score == null ? null : Number(r.pain_score),
    workOrderId: r.work_order_id ? String(r.work_order_id) : null,
    createdAt: String(r.created_at),
  };
}

export async function upsertSchedule(
  visitId: string, items: { timepoint: string; dueAt: Date }[], tx: DbExecutor = getDb(),
): Promise<void> {
  for (const it of items) {
    await tx`
      INSERT INTO clinical.postop_pain_followups (visit_id, timepoint, due_at)
      VALUES (${visitId}, ${it.timepoint}, ${it.dueAt.toISOString()})
      ON CONFLICT (visit_id, timepoint) DO UPDATE SET due_at=EXCLUDED.due_at`;
  }
}

export async function listByVisit(visitId: string): Promise<Followup[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.postop_pain_followups
    WHERE visit_id=${visitId} ORDER BY due_at ASC`;
  return rows.map(map);
}

export async function completeFollowup(
  visitId: string, timepoint: string, score: number, workOrderId: string | null,
  tx: DbExecutor = getDb(),
): Promise<Followup | null> {
  const rows = await tx`
    UPDATE clinical.postop_pain_followups
    SET completed_at=now(), pain_score=${score}, work_order_id=${workOrderId}
    WHERE visit_id=${visitId} AND timepoint=${timepoint} AND completed_at IS NULL
    RETURNING ${tx.unsafe(COLS)}`;
  return rows.length > 0 ? map(rows[0]) : null;
}
