/**
 * 健澜科技 jlmedaios - 疼痛评估 Repository（M29-B）
 * clinical.pain_assessments 读写。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export interface PainAssessment {
  id: string;
  visitId: string;
  score: number;
  assessType: string;
  location: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

const COLS = `id, visit_id, score, assess_type, location, note, created_by, created_at`;

function map(row: Record<string, unknown>): PainAssessment {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    score: Number(row.score),
    assessType: String(row.assess_type),
    location: row.location ? String(row.location) : null,
    note: row.note ? String(row.note) : null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  };
}

export async function createAssessment(
  input: { visitId: string; score: number; assessType: string; location?: string | null; note?: string | null; createdBy: string },
  tx: DbExecutor = getDb(),
): Promise<PainAssessment> {
  const rows = await tx`
    INSERT INTO clinical.pain_assessments
      (visit_id, score, assess_type, location, note, created_by)
    VALUES (${input.visitId}, ${input.score}, ${input.assessType}, ${input.location ?? null}, ${input.note ?? null}, ${input.createdBy})
    RETURNING ${tx.unsafe(COLS)}
  `;
  return map(rows[0]);
}

export async function listByVisit(visitId: string): Promise<PainAssessment[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.pain_assessments
    WHERE visit_id = ${visitId}
    ORDER BY created_at DESC
  `;
  return rows.map(map);
}
