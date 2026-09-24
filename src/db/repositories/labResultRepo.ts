/**
 * 健澜科技数智医院智能体 - 检验结果 Repository
 * clinical.lab_results 表 CRUD。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder } from './helpers.js';

export interface LabResult {
  id: string; visitId: string; patientId: string; reportNo: string | null;
  panelName: string | null; itemName: string; itemCode: string | null;
  specimen: string | null; value: string | null; numericValue: number | null;
  unit: string | null; refLow: number | null; refHigh: number | null;
  abnormalFlag: string | null; isCritical: boolean; resultTime: string | null; createdAt: string;
}

export interface LabResultCreateInput {
  visitId: string; patientId: string; reportNo?: string | null; panelName?: string | null;
  itemName: string; itemCode?: string | null; specimen?: string | null;
  value?: string | null; numericValue?: number | null; unit?: string | null;
  refLow?: number | null; refHigh?: number | null;
  abnormalFlag?: 'H' | 'L' | 'HH' | 'LL' | 'N' | null;
  isCritical?: boolean; resultTime?: string | null;
}

const SELECT_COLS = `id, visit_id, patient_id, report_no, panel_name, item_name, item_code, specimen, value, numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time, created_at`;

function mapRow(row: Record<string, unknown>): LabResult {
  return {
    id: String(row.id), visitId: String(row.visit_id), patientId: String(row.patient_id),
    reportNo: row.report_no ? String(row.report_no) : null,
    panelName: row.panel_name ? String(row.panel_name) : null,
    itemName: String(row.item_name), itemCode: row.item_code ? String(row.item_code) : null,
    specimen: row.specimen ? String(row.specimen) : null,
    value: row.value ? String(row.value) : null,
    numericValue: row.numeric_value !== null ? Number(row.numeric_value) : null,
    unit: row.unit ? String(row.unit) : null,
    refLow: row.ref_low !== null ? Number(row.ref_low) : null,
    refHigh: row.ref_high !== null ? Number(row.ref_high) : null,
    abnormalFlag: row.abnormal_flag ? String(row.abnormal_flag) : null,
    isCritical: Boolean(row.is_critical),
    resultTime: row.result_time ? String(row.result_time) : null,
    createdAt: String(row.created_at),
  };
}

export async function createLabResult(input: LabResultCreateInput, sql?: Sql): Promise<LabResult> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.lab_results (visit_id, patient_id, report_no, panel_name, item_name, item_code, specimen, value, numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time)
    VALUES (${input.visitId}, ${input.patientId}, ${input.reportNo ?? null}, ${input.panelName ?? null},
      ${input.itemName}, ${input.itemCode ?? null}, ${input.specimen ?? null}, ${input.value ?? null},
      ${input.numericValue ?? null}, ${input.unit ?? null}, ${input.refLow ?? null}, ${input.refHigh ?? null},
      ${input.abnormalFlag ?? null}, ${input.isCritical ?? false}, ${input.resultTime ?? new Date().toISOString()})
    RETURNING ${db(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getLabResultsByVisit(
  visitId: string, options?: { panelName?: string; limit?: number }, sql?: Sql,
): Promise<LabResult[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('visit_id = ?', visitId);
  if (options?.panelName) qb.where('panel_name = ?', options.panelName);
  const rows = await dynamicSelect<Record<string, unknown>>(db, SELECT_COLS, 'clinical.lab_results', qb, 'result_time DESC, created_at DESC', options?.limit ?? 200);
  return rows.map(mapRow);
}

export async function getLabResultsByPatient(
  patientId: string, options?: { itemCode?: string; limit?: number }, sql?: Sql,
): Promise<LabResult[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('patient_id = ?', patientId);
  if (options?.itemCode) qb.where('item_code = ?', options.itemCode);
  const rows = await dynamicSelect<Record<string, unknown>>(db, SELECT_COLS, 'clinical.lab_results', qb, 'result_time DESC', options?.limit ?? 200);
  return rows.map(mapRow);
}

export async function getCriticalLabResults(patientId?: string, limit = 50, sql?: Sql): Promise<LabResult[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().whereRaw('is_critical = true');
  if (patientId) qb.where('patient_id = ?', patientId);
  const rows = await dynamicSelect<Record<string, unknown>>(db, SELECT_COLS, 'clinical.lab_results', qb, 'result_time DESC', limit);
  return rows.map(mapRow);
}
