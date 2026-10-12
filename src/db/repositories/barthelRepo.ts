/**
 * 健澜科技 jlmedaios - Barthel ADL repo（M35-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Barthel {
  id: string; visitId: string;
  feeding: number; bathing: number; grooming: number; dressing: number;
  bowel: number; bladder: number; toileting: number;
  transfer: number; walking: number; stairs: number;
  totalScore: number; dependencyLevel: string;
  note: string | null; createdBy: string; createdAt: string;
}
const COLS = `id, visit_id, feeding, bathing, grooming, dressing, bowel, bladder, toileting, transfer, walking, stairs, total_score, dependency_level, note, created_by, created_at`;
function map(r: Record<string, unknown>): Barthel {
  return {
    id: String(r.id), visitId: String(r.visit_id),
    feeding: Number(r.feeding), bathing: Number(r.bathing), grooming: Number(r.grooming), dressing: Number(r.dressing),
    bowel: Number(r.bowel), bladder: Number(r.bladder), toileting: Number(r.toileting),
    transfer: Number(r.transfer), walking: Number(r.walking), stairs: Number(r.stairs),
    totalScore: Number(r.total_score), dependencyLevel: String(r.dependency_level),
    note: r.note ? String(r.note) : null,
    createdBy: String(r.created_by), createdAt: String(r.created_at),
  };
}

export async function create(
  inp: {
    visitId: string;
    feeding: number; bathing: number; grooming: number; dressing: number;
    bowel: number; bladder: number; toileting: number;
    transfer: number; walking: number; stairs: number;
    totalScore: number; dependencyLevel: string;
    note?: string | null; createdBy: string;
  },
  tx: DbExecutor = getDb(),
): Promise<Barthel> {
  const rows = await tx`
    INSERT INTO clinical.barthel_assessments
      (visit_id, feeding, bathing, grooming, dressing, bowel, bladder, toileting, transfer, walking, stairs, total_score, dependency_level, note, created_by)
    VALUES (${inp.visitId}, ${inp.feeding}, ${inp.bathing}, ${inp.grooming}, ${inp.dressing},
            ${inp.bowel}, ${inp.bladder}, ${inp.toileting},
            ${inp.transfer}, ${inp.walking}, ${inp.stairs},
            ${inp.totalScore}, ${inp.dependencyLevel}, ${inp.note ?? null}, ${inp.createdBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0]);
}

export async function listByVisit(visitId: string): Promise<Barthel[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.barthel_assessments
    WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(map);
}
