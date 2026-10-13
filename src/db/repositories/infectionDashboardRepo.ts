/**
 * 健澜科技 jlmedaios - 院感指标 repo（M76-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface InfectionMetric {
  id: string;
  month: string;
  department: string;
  handHygieneObservations: number;
  handHygieneCompliant: number;
  cautiCases: number;
  catheterDays: number;
  vapCases: number;
  ventilatorDays: number;
  clabsiCases: number;
  centralLineDays: number;
  ssiCases: number;
  operationCount: number;
  submittedBy: string;
  createdAt: string;
}

const COLS = `id, month, department, hand_hygiene_observations, hand_hygiene_compliant,
  cauti_cases, catheter_days, vap_cases, ventilator_days, clabsi_cases, central_line_days,
  ssi_cases, operation_count, submitted_by, created_at`;

function mapRow(r: Record<string, unknown>): InfectionMetric {
  return {
    id: String(r.id),
    month: String(r.month),
    department: String(r.department),
    handHygieneObservations: Number(r.hand_hygiene_observations),
    handHygieneCompliant: Number(r.hand_hygiene_compliant),
    cautiCases: Number(r.cauti_cases),
    catheterDays: Number(r.catheter_days),
    vapCases: Number(r.vap_cases),
    ventilatorDays: Number(r.ventilator_days),
    clabsiCases: Number(r.clabsi_cases),
    centralLineDays: Number(r.central_line_days),
    ssiCases: Number(r.ssi_cases),
    operationCount: Number(r.operation_count),
    submittedBy: String(r.submitted_by),
    createdAt: new Date(r.created_at as string | Date).toISOString(),
  };
}

export interface SubmitInput {
  month: string;
  department: string;
  handHygieneObservations?: number;
  handHygieneCompliant?: number;
  cautiCases?: number;
  catheterDays?: number;
  vapCases?: number;
  ventilatorDays?: number;
  clabsiCases?: number;
  centralLineDays?: number;
  ssiCases?: number;
  operationCount?: number;
  submittedBy: string;
}

export async function submitMetric(input: SubmitInput): Promise<InfectionMetric> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.infection_metrics
      (month, department, hand_hygiene_observations, hand_hygiene_compliant,
       cauti_cases, catheter_days, vap_cases, ventilator_days, clabsi_cases, central_line_days,
       ssi_cases, operation_count, submitted_by)
    VALUES (${input.month}, ${input.department}, ${input.handHygieneObservations ?? 0},
      ${input.handHygieneCompliant ?? 0}, ${input.cautiCases ?? 0}, ${input.catheterDays ?? 0},
      ${input.vapCases ?? 0}, ${input.ventilatorDays ?? 0}, ${input.clabsiCases ?? 0},
      ${input.centralLineDays ?? 0}, ${input.ssiCases ?? 0}, ${input.operationCount ?? 0}, ${input.submittedBy})
    ON CONFLICT (month, department) DO UPDATE SET
      hand_hygiene_observations = EXCLUDED.hand_hygiene_observations,
      hand_hygiene_compliant = EXCLUDED.hand_hygiene_compliant,
      cauti_cases = EXCLUDED.cauti_cases,
      catheter_days = EXCLUDED.catheter_days,
      vap_cases = EXCLUDED.vap_cases,
      ventilator_days = EXCLUDED.ventilator_days,
      clabsi_cases = EXCLUDED.clabsi_cases,
      central_line_days = EXCLUDED.central_line_days,
      ssi_cases = EXCLUDED.ssi_cases,
      operation_count = EXCLUDED.operation_count,
      submitted_by = EXCLUDED.submitted_by
    RETURNING ${db.unsafe(COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function listByMonth(month: string): Promise<InfectionMetric[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.infection_metrics
    WHERE month=${month} ORDER BY department ASC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

export async function listByDepartment(department: string): Promise<InfectionMetric[]> {
  const db = getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.infection_metrics
    WHERE department=${department} ORDER BY month DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
