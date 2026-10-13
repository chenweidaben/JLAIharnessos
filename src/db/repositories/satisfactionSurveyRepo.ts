/**
 * 健澜科技 jlmedaios - 患者满意度 4 维度 repo（M63-A）
 * 复用 clinical.satisfaction_surveys（M3-O），写入 nursing/logistics/department 扩展列。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, withTx } from '../../db/pool.js';

export interface SurveyRow {
  id: string;
  visitId: string;
  patientId: string;
  medicalScore: number;
  nursingScore: number | null;
  logisticsScore: number | null;
  environmentScore: number;
  comment: string | null;
  department: string;
  submittedBy: string;
  createdAt: string;
}

export interface SubmitInput {
  visitId: string;
  patientId: string;
  medicalScore: number;
  nursingScore: number;
  logisticsScore: number;
  environmentScore: number;
  comment?: string | null;
  department: string;
  submittedBy: string;
}

function mapRow(r: Record<string, unknown>): SurveyRow {
  return {
    id: String(r.id),
    visitId: r.visit_id ? String(r.visit_id) : '',
    patientId: String(r.patient_id),
    medicalScore: Number(r.medical_score),
    nursingScore: r.nursing_score == null ? null : Number(r.nursing_score),
    logisticsScore: r.logistics_score == null ? null : Number(r.logistics_score),
    environmentScore: Number(r.environment_score),
    comment: r.comment == null ? null : String(r.comment),
    department: r.department ? String(r.department) : '',
    submittedBy: r.submitted_by ? String(r.submitted_by) : '',
    createdAt: String(r.created_at),
  };
}

const COLS = `id, visit_id, patient_id, medical_score, nursing_score, logistics_score, environment_score, comment, department, submitted_by, created_at`;

export async function submitSurvey(input: SubmitInput): Promise<SurveyRow> {
  return withTx(async (q) => {
    const rows = await q`
      INSERT INTO clinical.satisfaction_surveys
        (survey_no, patient_id, visit_id, source_type, overall_score,
         medical_score, service_score, environment_score, process_score, wait_score,
         nursing_score, logistics_score, department, comment, submitted_by)
      VALUES (
        ${'SAT' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)},
        ${input.patientId}, ${input.visitId}, 'inpatient',
        ${Math.round((input.medicalScore + input.nursingScore + input.logisticsScore + input.environmentScore) / 4)},
        ${input.medicalScore}, ${input.nursingScore}, ${input.environmentScore}, ${input.logisticsScore}, ${input.medicalScore},
        ${input.nursingScore}, ${input.logisticsScore}, ${input.department}, ${input.comment ?? null}, ${input.submittedBy}
      ) RETURNING ${q.unsafe(COLS)}`;
    return mapRow(rows[0] as Record<string, unknown>);
  });
}

export async function listByDepartment(department: string): Promise<SurveyRow[]> {
  if (!department.trim()) return [];
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.satisfaction_surveys WHERE department=${department.trim()} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function listAll(): Promise<SurveyRow[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.satisfaction_surveys ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function listByVisit(visitId: string): Promise<SurveyRow[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.satisfaction_surveys WHERE visit_id=${visitId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
