/**
 * 健澜科技 jlmedaios - 月度结算报表 repo（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';

const db = getDb();

export interface SummaryRow {
  id: string; period: string;
  drgCases: number; dipCases: number;
  totalScore: number; pointValue: number;
  insuranceSettlement: number; patientOutOfPocket: number;
}

function map(r: Record<string, unknown>): SummaryRow {
  return {
    id: String(r.id), period: String(r.period),
    drgCases: Number(r.drg_cases), dipCases: Number(r.dip_cases),
    totalScore: Number(r.total_score), pointValue: Number(r.point_value),
    insuranceSettlement: Number(r.insurance_settlement), patientOutOfPocket: Number(r.patient_out_of_pocket),
  };
}

export async function upsertSummary(input: {
  period: string; drgCases: number; dipCases: number; totalScore: number; pointValue: number; insuranceSettlement: number; patientOutOfPocket: number;
}): Promise<SummaryRow> {
  const rows = await db`
    INSERT INTO clinical.settlement_monthly_summary (period, drg_cases, dip_cases, total_score, point_value, insurance_settlement, patient_out_of_pocket)
    VALUES (${input.period}, ${input.drgCases}, ${input.dipCases}, ${input.totalScore}, ${input.pointValue}, ${input.insuranceSettlement}, ${input.patientOutOfPocket})
    ON CONFLICT (period) DO UPDATE SET
      drg_cases=EXCLUDED.drg_cases, dip_cases=EXCLUDED.dip_cases, total_score=EXCLUDED.total_score,
      point_value=EXCLUDED.point_value, insurance_settlement=EXCLUDED.insurance_settlement,
      patient_out_of_pocket=EXCLUDED.patient_out_of_pocket, computed_at=now()
    RETURNING id, period, drg_cases, dip_cases, total_score, point_value, insurance_settlement, patient_out_of_pocket`;
  return map(rows[0] as Record<string, unknown>);
}

export async function getSummary(period: string): Promise<SummaryRow | null> {
  const rows = await db`
    SELECT id, period, drg_cases, dip_cases, total_score, point_value, insurance_settlement, patient_out_of_pocket
    FROM clinical.settlement_monthly_summary WHERE period=${period}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

export async function listSummaries(): Promise<SummaryRow[]> {
  const rows = await db`
    SELECT id, period, drg_cases, dip_cases, total_score, point_value, insurance_settlement, patient_out_of_pocket
    FROM clinical.settlement_monthly_summary ORDER BY period DESC`;
  return rows.map((r) => map(r as Record<string, unknown>));
}
