/**
 * 健澜科技 jlmedaios - 疼痛门诊记录 repo（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface PainClinicRecord {
  id: string;
  patientId: string;
  visitId: string | null;
  baselineNrs: number;
  currentNrs: number;
  breakthroughCount: number;
  analgesic: string;
  doseNote: string | null;
  titrationRound: number;
  adjustmentSuggestion: string | null;
  recordedBy: string;
  createdAt: string;
}

const COLS = `id, patient_id, visit_id, baseline_nrs, current_nrs, breakthrough_count,
  analgesic, dose_note, titration_round, adjustment_suggestion, recorded_by, created_at`;

function map(r: Record<string, unknown>): PainClinicRecord {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    visitId: r.visit_id ? String(r.visit_id) : null,
    baselineNrs: Number(r.baseline_nrs),
    currentNrs: Number(r.current_nrs),
    breakthroughCount: Number(r.breakthrough_count),
    analgesic: String(r.analgesic),
    doseNote: r.dose_note ? String(r.dose_note) : null,
    titrationRound: Number(r.titration_round),
    adjustmentSuggestion: r.adjustment_suggestion ? String(r.adjustment_suggestion) : null,
    recordedBy: String(r.recorded_by),
    createdAt: String(r.created_at),
  };
}

export async function createRecord(
  input: {
    patientId: string; visitId?: string | null; baselineNrs: number; currentNrs: number;
    breakthroughCount: number; analgesic: string; doseNote?: string | null;
    titrationRound: number; adjustmentSuggestion: string | null; recordedBy: string;
  },
  tx: DbExecutor = getDb(),
): Promise<PainClinicRecord> {
  const rows = await tx`
    INSERT INTO clinical.pain_clinic_records
      (patient_id, visit_id, baseline_nrs, current_nrs, breakthrough_count,
       analgesic, dose_note, titration_round, adjustment_suggestion, recorded_by)
    VALUES
      (${input.patientId}, ${input.visitId ?? null}, ${input.baselineNrs}, ${input.currentNrs},
       ${input.breakthroughCount}, ${input.analgesic}, ${input.doseNote ?? null},
       ${input.titrationRound}, ${input.adjustmentSuggestion}, ${input.recordedBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function listByPatient(patientId: string, tx: DbExecutor = getDb()): Promise<PainClinicRecord[]> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.pain_clinic_records
    WHERE patient_id=${patientId} ORDER BY created_at DESC, id DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}

export async function getLatest(patientId: string, tx: DbExecutor = getDb()): Promise<PainClinicRecord | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.pain_clinic_records
    WHERE patient_id=${patientId} ORDER BY created_at DESC, id DESC LIMIT 1`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
