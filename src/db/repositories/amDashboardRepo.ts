/**
 * 健澜科技 jlmedaios - 药事指标 repo（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface AmMetric {
  id: string;
  month: string;
  department: string;
  dddsTotal: number;
  inpatientDays: number;
  antibioticPatients: number;
  totalInpatients: number;
  specialClassPatients: number;
  prophylaxisCases: number;
  prophylaxisReasonable: number;
  submittedBy: string;
  createdAt: string;
}

const COLS = `id, month, department, ddds_total, inpatient_days, antibiotic_patients,
  total_inpatients, special_class_patients, prophylaxis_cases, prophylaxis_reasonable,
  submitted_by, created_at`;

function mapRow(r: Record<string, unknown>): AmMetric {
  return {
    id: String(r.id),
    month: String(r.month),
    department: String(r.department),
    dddsTotal: Number(r.ddds_total),
    inpatientDays: Number(r.inpatient_days),
    antibioticPatients: Number(r.antibiotic_patients),
    totalInpatients: Number(r.total_inpatients),
    specialClassPatients: Number(r.special_class_patients),
    prophylaxisCases: Number(r.prophylaxis_cases),
    prophylaxisReasonable: Number(r.prophylaxis_reasonable),
    submittedBy: String(r.submitted_by),
    createdAt: new Date(r.created_at as string | Date).toISOString(),
  };
}

export interface SubmitInput {
  month: string;
  department: string;
  dddsTotal?: number;
  inpatientDays?: number;
  antibioticPatients?: number;
  totalInpatients?: number;
  specialClassPatients?: number;
  prophylaxisCases?: number;
  prophylaxisReasonable?: number;
  submittedBy: string;
}

export async function submitMetric(input: SubmitInput): Promise<AmMetric> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.am_metrics
      (month, department, ddds_total, inpatient_days, antibiotic_patients, total_inpatients,
       special_class_patients, prophylaxis_cases, prophylaxis_reasonable, submitted_by)
    VALUES (${input.month}, ${input.department}, ${input.dddsTotal ?? 0}, ${input.inpatientDays ?? 0},
      ${input.antibioticPatients ?? 0}, ${input.totalInpatients ?? 0}, ${input.specialClassPatients ?? 0},
      ${input.prophylaxisCases ?? 0}, ${input.prophylaxisReasonable ?? 0}, ${input.submittedBy})
    ON CONFLICT (month, department) DO UPDATE SET
      ddds_total = EXCLUDED.ddds_total,
      inpatient_days = EXCLUDED.inpatient_days,
      antibiotic_patients = EXCLUDED.antibiotic_patients,
      total_inpatients = EXCLUDED.total_inpatients,
      special_class_patients = EXCLUDED.special_class_patients,
      prophylaxis_cases = EXCLUDED.prophylaxis_cases,
      prophylaxis_reasonable = EXCLUDED.prophylaxis_reasonable,
      submitted_by = EXCLUDED.submitted_by
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByMonth(month: string): Promise<AmMetric[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.am_metrics
    WHERE month=${month} ORDER BY department ASC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function listByDepartment(department: string): Promise<AmMetric[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.am_metrics
    WHERE department=${department} ORDER BY month DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
