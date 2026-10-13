/**
 * 健澜科技 jlmedaios - 营养科会诊 repo（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface NutritionConsult {
  id: string;
  visitId: string;
  consultType: string;
  nutritionDiagnosis: string;
  plan: string;
  caloriesPerDay: number;
  followupDays: number;
  status: string;
  dietitian: string;
  createdAt: string;
}

const COLS = `id, visit_id, consult_type, nutrition_diagnosis, plan, calories_per_day,
  followup_days, status, dietitian, created_at`;

function map(r: Record<string, unknown>): NutritionConsult {
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    consultType: String(r.consult_type),
    nutritionDiagnosis: String(r.nutrition_diagnosis),
    plan: String(r.plan),
    caloriesPerDay: Number(r.calories_per_day),
    followupDays: Number(r.followup_days),
    status: String(r.status),
    dietitian: String(r.dietitian),
    createdAt: String(r.created_at),
  };
}

export async function createConsult(
  input: {
    visitId: string; consultType: string; nutritionDiagnosis: string; plan: string;
    caloriesPerDay: number; followupDays: number; dietitian: string;
  },
  tx: DbExecutor = getDb(),
): Promise<NutritionConsult> {
  const rows = await tx`
    INSERT INTO clinical.nutrition_consults
      (visit_id, consult_type, nutrition_diagnosis, plan, calories_per_day, followup_days, dietitian)
    VALUES
      (${input.visitId}, ${input.consultType}, ${input.nutritionDiagnosis}, ${input.plan},
       ${input.caloriesPerDay}, ${input.followupDays}, ${input.dietitian})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function recordFollowup(id: string, tx: DbExecutor = getDb()): Promise<NutritionConsult> {
  const rows = await tx`
    UPDATE clinical.nutrition_consults SET status='followed_up' WHERE id=${id}
    RETURNING ${tx.unsafe(COLS)}`;
  if (rows.length === 0) throw new Error('会诊记录不存在');
  return map(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<NutritionConsult[]> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.nutrition_consults
    WHERE visit_id=${visitId} ORDER BY created_at DESC, id DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}
