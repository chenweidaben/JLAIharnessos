/**
 * 健澜科技 jlmedaios - 慢病管理 repo（M39-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Plan {
  id: string; patientId: string; disease: string;
  targetSbp: number | null; targetDbp: number | null; targetHba1c: number | null;
  nextFollowupAt: string; createdAt: string;
}
export interface Vitals {
  id: string; patientId: string;
  sbp: number | null; dbp: number | null;
  fastingGlucose: number | null; hba1c: number | null;
  measuredAt: string; note: string | null; createdBy: string;
}
const PCOLS = `id, patient_id, disease, target_sbp, target_dbp, target_hba1c, next_followup_at, created_at`;
const VCOLS = `id, patient_id, sbp, dbp, fasting_glucose, hba1c, measured_at, note, created_by`;
function pmap(r: Record<string, unknown>): Plan {
  return {
    id: String(r.id), patientId: String(r.patient_id), disease: String(r.disease),
    targetSbp: r.target_sbp == null ? null : Number(r.target_sbp),
    targetDbp: r.target_dbp == null ? null : Number(r.target_dbp),
    targetHba1c: r.target_hba1c == null ? null : Number(r.target_hba1c),
    nextFollowupAt: String(r.next_followup_at), createdAt: String(r.created_at),
  };
}
function vmap(r: Record<string, unknown>): Vitals {
  return {
    id: String(r.id), patientId: String(r.patient_id),
    sbp: r.sbp == null ? null : Number(r.sbp), dbp: r.dbp == null ? null : Number(r.dbp),
    fastingGlucose: r.fasting_glucose == null ? null : Number(r.fasting_glucose),
    hba1c: r.hba1c == null ? null : Number(r.hba1c),
    measuredAt: String(r.measured_at),
    note: r.note ? String(r.note) : null,
    createdBy: String(r.created_by),
  };
}

export async function createPlan(inp: {
  patientId: string; disease: 'hypertension' | 'diabetes';
  targetSbp?: number | null; targetDbp?: number | null; targetHba1c?: number | null;
  nextFollowupAt: string;
}, tx: DbExecutor = getDb()): Promise<Plan> {
  const rows = await tx`
    INSERT INTO clinical.chronic_followup_plans
      (patient_id, disease, target_sbp, target_dbp, target_hba1c, next_followup_at)
    VALUES (${inp.patientId}, ${inp.disease}, ${inp.targetSbp ?? null}, ${inp.targetDbp ?? null}, ${inp.targetHba1c ?? null}, ${inp.nextFollowupAt})
    RETURNING ${tx.unsafe(PCOLS)}`;
  return pmap(rows[0]);
}

export async function listPlans(patientId: string): Promise<Plan[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(PCOLS)} FROM clinical.chronic_followup_plans WHERE patient_id=${patientId} ORDER BY created_at DESC`;
  return rows.map(pmap);
}

export async function recordVitals(inp: {
  patientId: string; sbp?: number | null; dbp?: number | null;
  fastingGlucose?: number | null; hba1c?: number | null;
  note?: string | null; createdBy: string;
}, tx: DbExecutor = getDb()): Promise<Vitals> {
  const rows = await tx`
    INSERT INTO clinical.chronic_vitals
      (patient_id, sbp, dbp, fasting_glucose, hba1c, note, created_by)
    VALUES (${inp.patientId}, ${inp.sbp ?? null}, ${inp.dbp ?? null}, ${inp.fastingGlucose ?? null}, ${inp.hba1c ?? null}, ${inp.note ?? null}, ${inp.createdBy})
    RETURNING ${tx.unsafe(VCOLS)}`;
  return vmap(rows[0]);
}

export async function listVitalsByPatient(patientId: string): Promise<Vitals[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(VCOLS)} FROM clinical.chronic_vitals WHERE patient_id=${patientId} ORDER BY measured_at DESC`;
  return rows.map(vmap);
}
