/**
 * 健澜科技 jlmedaios - VTE 抗凝 repo（M46-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Anticoag {
  id: string; visitId: string; drug: string; startDate: string;
  endDate: string | null; plannedDays: number; bleedingScore: number;
  active: boolean; note: string | null; createdBy: string; createdAt: string;
}
const COLS = `id, visit_id, drug, start_date, end_date, planned_days, bleeding_score, active, note, created_by, created_at`;
function rmap(r: Record<string, unknown>): Anticoag {
  return {
    id: String(r.id), visitId: String(r.visit_id), drug: String(r.drug),
    startDate: new Date(String(r.start_date)).toISOString().slice(0, 10),
    endDate: r.end_date != null ? new Date(String(r.end_date)).toISOString().slice(0, 10) : null,
    plannedDays: Number(r.planned_days), bleedingScore: Number(r.bleeding_score),
    active: Boolean(r.active), note: r.note != null ? String(r.note) : null,
    createdBy: String(r.created_by), createdAt: String(r.created_at),
  };
}

export async function startAnticoag(inp: {
  visitId: string; drug: string; startDate: string; plannedDays: number; createdBy: string;
}, tx: DbExecutor = getDb()): Promise<Anticoag> {
  const rows = await tx`
    INSERT INTO clinical.vte_anticoagulations (visit_id, drug, start_date, planned_days, created_by)
    VALUES (${inp.visitId}, ${inp.drug}, ${inp.startDate}, ${inp.plannedDays}, ${inp.createdBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return rmap(rows[0]);
}

export async function recordBleedingScore(id: string, score: number, tx: DbExecutor = getDb()): Promise<Anticoag> {
  const rows = await tx`
    UPDATE clinical.vte_anticoagulations SET bleeding_score=${score} WHERE id=${id}
    RETURNING ${tx.unsafe(COLS)}`;
  return rmap(rows[0]);
}

export async function listByVisit(visitId: string): Promise<Anticoag[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.vte_anticoagulations WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return rows.map(rmap);
}

export async function stopAnticoag(id: string, endDate: string, tx: DbExecutor = getDb()): Promise<Anticoag> {
  const rows = await tx`
    UPDATE clinical.vte_anticoagulations SET active=false, end_date=${endDate} WHERE id=${id}
    RETURNING ${tx.unsafe(COLS)}`;
  return rmap(rows[0]);
}
