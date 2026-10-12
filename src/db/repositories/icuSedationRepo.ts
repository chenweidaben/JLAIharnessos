/**
 * 健澜科技 jlmedaios - ICU RASS 镇静评分 repo（M33-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Sedation {
  id: string; visitId: string; rassScore: number; targetRass: number;
  onVentilator: boolean; sedativeDrug: string | null; note: string | null;
  createdBy: string; createdAt: string;
}
const COLS = `id, visit_id, rass_score, target_rass, on_ventilator, sedative_drug, note, created_by, created_at`;
function map(r: Record<string, unknown>): Sedation {
  return {
    id: String(r.id), visitId: String(r.visit_id),
    rassScore: Number(r.rass_score), targetRass: Number(r.target_rass),
    onVentilator: Boolean(r.on_ventilator),
    sedativeDrug: r.sedative_drug ? String(r.sedative_drug) : null,
    note: r.note ? String(r.note) : null,
    createdBy: String(r.created_by), createdAt: String(r.created_at),
  };
}

export async function create(
  inp: { visitId: string; rassScore: number; targetRass: number; onVentilator: boolean; sedativeDrug?: string | null; note?: string | null; createdBy: string },
  tx: DbExecutor = getDb(),
): Promise<Sedation> {
  const rows = await tx`
    INSERT INTO clinical.icu_sedation_records
      (visit_id, rass_score, target_rass, on_ventilator, sedative_drug, note, created_by)
    VALUES (${inp.visitId}, ${inp.rassScore}, ${inp.targetRass}, ${inp.onVentilator}, ${inp.sedativeDrug ?? null}, ${inp.note ?? null}, ${inp.createdBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0]);
}

export async function listByVisit(visitId: string): Promise<Sedation[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.icu_sedation_records
    WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(map);
}
