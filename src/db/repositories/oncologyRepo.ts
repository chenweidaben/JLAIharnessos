/**
 * 健澜科技 jlmedaios - 肿瘤随访 repo（M41-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Cycle { id: string; patientId: string; drugName: string; cycleNo: number; plannedDate: string; status: string; createdAt: string; }
export interface AdverseEvent { id: string; cycleId: string; patientId: string; term: string; grade: number; reportedAt: string; createdBy: string; }

const CCOLS = `id, patient_id, drug_name, cycle_no, planned_date, status, created_at`;
const AECOLS = `id, cycle_id, patient_id, term, grade, reported_at, created_by`;

function cmap(r: Record<string, unknown>): Cycle {
  return {
    id: String(r.id), patientId: String(r.patient_id), drugName: String(r.drug_name),
    cycleNo: Number(r.cycle_no), plannedDate: String(r.planned_date),
    status: String(r.status), createdAt: String(r.created_at),
  };
}
function aemap(r: Record<string, unknown>): AdverseEvent {
  return {
    id: String(r.id), cycleId: String(r.cycle_id), patientId: String(r.patient_id),
    term: String(r.term), grade: Number(r.grade), reportedAt: String(r.reported_at), createdBy: String(r.created_by),
  };
}

export async function createCycle(inp: { patientId: string; drugName: string; cycleNo: number; plannedDate: string }, tx: DbExecutor = getDb()): Promise<Cycle> {
  const rows = await tx`
    INSERT INTO clinical.chemo_cycles (patient_id, drug_name, cycle_no, planned_date)
    VALUES (${inp.patientId}, ${inp.drugName}, ${inp.cycleNo}, ${inp.plannedDate})
    RETURNING ${tx.unsafe(CCOLS)}`;
  return cmap(rows[0]);
}

export async function listCycles(patientId: string): Promise<Cycle[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(CCOLS)} FROM clinical.chemo_cycles WHERE patient_id=${patientId} ORDER BY planned_date`;
  return rows.map(cmap);
}

export async function recordAdverseEvent(inp: { cycleId: string; patientId: string; term: string; grade: number; createdBy: string }, tx: DbExecutor = getDb()): Promise<AdverseEvent> {
  const rows = await tx`
    INSERT INTO clinical.chemo_adverse_events (cycle_id, patient_id, term, grade, created_by)
    VALUES (${inp.cycleId}, ${inp.patientId}, ${inp.term}, ${inp.grade}, ${inp.createdBy})
    RETURNING ${tx.unsafe(AECOLS)}`;
  return aemap(rows[0]);
}

export async function listAdverseEvents(patientId: string): Promise<AdverseEvent[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(AECOLS)} FROM clinical.chemo_adverse_events WHERE patient_id=${patientId} ORDER BY reported_at DESC`;
  return rows.map(aemap);
}
