/**
 * 健澜科技 jlmedaios - 入院营养风险筛查 Repository（M29-A）
 *
 * clinical.nutrition_screenings 读写。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export interface NutritionScreening {
  id: string;
  visitId: string;
  nutritionScore: number;
  diseaseSeverity: number;
  ageBonus: number;
  totalScore: number;
  nutritionRisk: boolean;
  resultNote: string | null;
  createdBy: string;
  createdAt: string;
}

const COLS = `id, visit_id, nutrition_score, disease_severity, age_bonus, total_score, nutrition_risk, result_note, created_by, created_at`;

function map(row: Record<string, unknown>): NutritionScreening {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    nutritionScore: Number(row.nutrition_score),
    diseaseSeverity: Number(row.disease_severity),
    ageBonus: Number(row.age_bonus),
    totalScore: Number(row.total_score),
    nutritionRisk: Boolean(row.nutrition_risk),
    resultNote: row.result_note ? String(row.result_note) : null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  };
}

export async function createScreening(
  input: {
    visitId: string;
    nutritionScore: number;
    diseaseSeverity: number;
    ageBonus: number;
    totalScore: number;
    nutritionRisk: boolean;
    resultNote?: string | null;
    createdBy: string;
  },
  tx: DbExecutor = getDb(),
): Promise<NutritionScreening> {
  const rows = await tx`
    INSERT INTO clinical.nutrition_screenings
      (visit_id, nutrition_score, disease_severity, age_bonus, total_score, nutrition_risk, result_note, created_by)
    VALUES (${input.visitId}, ${input.nutritionScore}, ${input.diseaseSeverity}, ${input.ageBonus},
            ${input.totalScore}, ${input.nutritionRisk}, ${input.resultNote ?? null}, ${input.createdBy})
    RETURNING ${tx.unsafe(COLS)}
  `;
  return map(rows[0]);
}

export async function listByVisit(visitId: string): Promise<NutritionScreening[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.nutrition_screenings
    WHERE visit_id = ${visitId}
    ORDER BY created_at DESC
  `;
  return rows.map(map);
}

export async function getLatestByVisit(visitId: string): Promise<NutritionScreening | null> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.nutrition_screenings
    WHERE visit_id = ${visitId}
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ? map(rows[0]) : null;
}
