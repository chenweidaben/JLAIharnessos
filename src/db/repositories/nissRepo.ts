/**
 * 健澜科技 jlmedaios - 院感上报 repo（M45-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Infection {
  id: string; visitId: string; infectionType: string; pathogen: string | null;
  reportDate: string; status: string; isolationRequired: boolean;
  note: string | null; reportedBy: string; createdAt: string;
}
const COLS = `id, visit_id, infection_type, pathogen, report_date, status, isolation_required, note, reported_by, created_at`;
function rmap(r: Record<string, unknown>): Infection {
  return {
    id: String(r.id), visitId: String(r.visit_id), infectionType: String(r.infection_type),
    pathogen: r.pathogen != null ? String(r.pathogen) : null,
    reportDate: new Date(String(r.report_date)).toISOString().slice(0, 10),
    status: String(r.status), isolationRequired: Boolean(r.isolation_required),
    note: r.note != null ? String(r.note) : null,
    reportedBy: String(r.reported_by), createdAt: String(r.created_at),
  };
}

export async function reportInfection(inp: {
  visitId: string; infectionType: string; pathogen?: string | null;
  isolationRequired: boolean; note?: string | null; reportedBy: string;
}, tx: DbExecutor = getDb()): Promise<Infection> {
  const rows = await tx`
    INSERT INTO clinical.nosocomial_infections
      (visit_id, infection_type, pathogen, isolation_required, note, reported_by)
    VALUES (${inp.visitId}, ${inp.infectionType}, ${inp.pathogen ?? null}, ${inp.isolationRequired}, ${inp.note ?? null}, ${inp.reportedBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return rmap(rows[0]);
}

export async function listActive(): Promise<Infection[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.nosocomial_infections WHERE status IN ('reported','under_investigation') ORDER BY report_date DESC`;
  return rows.map(rmap);
}

export async function getById(id: string): Promise<Infection | null> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.nosocomial_infections WHERE id=${id}`;
  return rows[0] ? rmap(rows[0]) : null;
}

export async function updateStatus(id: string, status: string, tx: DbExecutor = getDb()): Promise<Infection> {
  const rows = await tx`
    UPDATE clinical.nosocomial_infections SET status=${status} WHERE id=${id}
    RETURNING ${tx.unsafe(COLS)}`;
  return rmap(rows[0]);
}
