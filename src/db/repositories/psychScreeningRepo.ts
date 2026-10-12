/**
 * 健澜科技 jlmedaios - 心理筛查 repo（M44-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Screening {
  id: string; visitId: string;
  phq9Answers: number[]; gad7Answers: number[];
  phq9Total: number; phq9Level: string;
  gad7Total: number; gad7Level: string;
  createdBy: string; createdAt: string;
}
const COLS = `id, visit_id, phq9_answers, gad7_answers, phq9_total, phq9_level, gad7_total, gad7_level, created_by, created_at`;
function rmap(r: Record<string, unknown>): Screening {
  return {
    id: String(r.id), visitId: String(r.visit_id),
    phq9Answers: (r.phq9_answers as number[]) ?? [],
    gad7Answers: (r.gad7_answers as number[]) ?? [],
    phq9Total: Number(r.phq9_total), phq9Level: String(r.phq9_level),
    gad7Total: Number(r.gad7_total), gad7Level: String(r.gad7_level),
    createdBy: String(r.created_by), createdAt: String(r.created_at),
  };
}

export async function create(inp: {
  visitId: string; phq9Answers: number[]; gad7Answers: number[];
  phq9Total: number; phq9Level: string; gad7Total: number; gad7Level: string; createdBy: string;
}, tx: DbExecutor = getDb()): Promise<Screening> {
  const rows = await tx`
    INSERT INTO clinical.psych_screenings
      (visit_id, phq9_answers, gad7_answers, phq9_total, phq9_level, gad7_total, gad7_level, created_by)
    VALUES (${inp.visitId}, ${inp.phq9Answers}, ${inp.gad7Answers}, ${inp.phq9Total}, ${inp.phq9Level}, ${inp.gad7Total}, ${inp.gad7Level}, ${inp.createdBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return rmap(rows[0]);
}

export async function listByVisit(visitId: string): Promise<Screening[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.psych_screenings WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(rmap);
}

export async function getLatestByVisit(visitId: string): Promise<Screening | null> {
  const rows = await listByVisit(visitId);
  return rows[0] ?? null;
}
