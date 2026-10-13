/**
 * 健澜科技 jlmedaios - MDT 治疗方案 repo（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface TreatmentPlan {
  id: string;
  mdtConsultId: string;
  visitId: string;
  planType: string;
  draft: string;
  scheduledAt: string | null;
  status: string;
  confirmedBy: string | null;
  createdAt: string;
}

const COLS = `id, mdt_consult_id, visit_id, plan_type, draft, scheduled_at, status, confirmed_by, created_at`;

function mapRow(r: Record<string, unknown>): TreatmentPlan {
  return {
    id: String(r.id),
    mdtConsultId: String(r.mdt_consult_id),
    visitId: String(r.visit_id),
    planType: String(r.plan_type),
    draft: String(r.draft),
    scheduledAt: r.scheduled_at == null ? null : String(r.scheduled_at),
    status: String(r.status),
    confirmedBy: r.confirmed_by == null ? null : String(r.confirmed_by),
    createdAt: String(r.created_at),
  };
}

export interface CreateInput {
  mdtConsultId: string;
  visitId: string;
  planType: string;
  draft: string;
}

export async function createFromMdt(input: CreateInput): Promise<TreatmentPlan> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.mdt_treatment_plans
      (mdt_consult_id, visit_id, plan_type, draft)
    VALUES (${input.mdtConsultId}, ${input.visitId}, ${input.planType}, ${input.draft})
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function confirmPlan(id: string, scheduledAt: string, confirmedBy: string): Promise<TreatmentPlan> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.mdt_treatment_plans
    SET status='confirmed', scheduled_at=${scheduledAt}, confirmed_by=${confirmedBy}
    WHERE id=${id} RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string): Promise<TreatmentPlan[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.mdt_treatment_plans WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
