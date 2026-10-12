/**
 * 健澜科技 jlmedaios - 产后访视 repo（M34-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface PostpartumVisit {
  id: string; motherVisitId: string; babyVisitId: string | null;
  postpartumDay: number; breastfeedingScore: number;
  jaundiceTcb: number | null; jaundiceVisual: string; motherTempC: number | null;
  note: string | null; createdBy: string; createdAt: string;
}
const COLS = `id, mother_visit_id, baby_visit_id, postpartum_day, breastfeeding_score, jaundice_tcb, jaundice_visual, mother_temp_c, note, created_by, created_at`;
function map(r: Record<string, unknown>): PostpartumVisit {
  return {
    id: String(r.id), motherVisitId: String(r.mother_visit_id),
    babyVisitId: r.baby_visit_id ? String(r.baby_visit_id) : null,
    postpartumDay: Number(r.postpartum_day),
    breastfeedingScore: Number(r.breastfeeding_score),
    jaundiceTcb: r.jaundice_tcb == null ? null : Number(r.jaundice_tcb),
    jaundiceVisual: String(r.jaundice_visual),
    motherTempC: r.mother_temp_c == null ? null : Number(r.mother_temp_c),
    note: r.note ? String(r.note) : null,
    createdBy: String(r.created_by), createdAt: String(r.created_at),
  };
}

export async function create(
  inp: {
    motherVisitId: string; babyVisitId?: string | null; postpartumDay: number;
    breastfeedingScore: number; jaundiceTcb?: number | null; jaundiceVisual?: string;
    motherTempC?: number | null; note?: string | null; createdBy: string;
  },
  tx: DbExecutor = getDb(),
): Promise<PostpartumVisit> {
  const rows = await tx`
    INSERT INTO clinical.postpartum_visits
      (mother_visit_id, baby_visit_id, postpartum_day, breastfeeding_score, jaundice_tcb, jaundice_visual, mother_temp_c, note, created_by)
    VALUES (${inp.motherVisitId}, ${inp.babyVisitId ?? null}, ${inp.postpartumDay}, ${inp.breastfeedingScore},
            ${inp.jaundiceTcb ?? null}, ${inp.jaundiceVisual ?? 'none'}, ${inp.motherTempC ?? null}, ${inp.note ?? null}, ${inp.createdBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0]);
}

export async function listByMother(motherVisitId: string): Promise<PostpartumVisit[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.postpartum_visits
    WHERE mother_visit_id=${motherVisitId} ORDER BY postpartum_day ASC`;
  return rows.map(map);
}
