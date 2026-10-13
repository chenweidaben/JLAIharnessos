/**
 * 健澜科技 jlmedaios - 出院计划 repo（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface DischargePlan {
  id: string;
  visitId: string;
  dischargeGuidance: string;
  medicationSummary: string;
  followupDate: string;
  followupDepartment: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

const COLS = `id, visit_id, discharge_guidance, medication_summary, followup_date, followup_department,
  status, created_by, created_at`;

function map(r: Record<string, unknown>): DischargePlan {
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    dischargeGuidance: String(r.discharge_guidance),
    medicationSummary: String(r.medication_summary),
    followupDate: String(r.followup_date),
    followupDepartment: String(r.followup_department),
    status: String(r.status),
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
  };
}

export async function createPlan(
  input: {
    visitId: string; dischargeGuidance: string; medicationSummary: string;
    followupDate: string; followupDepartment: string; createdBy: string;
  },
  tx: DbExecutor = getDb(),
): Promise<DischargePlan> {
  const rows = await tx`
    INSERT INTO clinical.discharge_plans
      (visit_id, discharge_guidance, medication_summary, followup_date, followup_department, created_by)
    VALUES
      (${input.visitId}, ${input.dischargeGuidance}, ${input.medicationSummary},
       ${input.followupDate}, ${input.followupDepartment}, ${input.createdBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function pushToPatient(id: string, tx: DbExecutor = getDb()): Promise<DischargePlan> {
  const rows = await tx`
    UPDATE clinical.discharge_plans SET status='pushed' WHERE id=${id} AND status='planned'
    RETURNING ${tx.unsafe(COLS)}`;
  if (rows.length === 0) throw new Error('出院计划不存在或已推送');
  return map(rows[0] as Record<string, unknown>);
}

export async function getByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<DischargePlan | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.discharge_plans WHERE visit_id=${visitId} LIMIT 1`;
  return rows.length === 0 ? null : map(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<DischargePlan[]> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.discharge_plans
    WHERE visit_id=${visitId} ORDER BY created_at DESC, id DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}
