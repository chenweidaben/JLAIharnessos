/**
 * 健澜科技 jlmedaios - 互联网在线报告 Repository（M3-N）
 *
 * 只读聚合：检验结果（lab_results）+ 影像报告（imaging_reports）
 *          + AI 检验解读（lab_interpretations）。
 * 报告与院内一致（同一临床表），DataScope 过滤在聚合器层执行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* -------------------------------- 类型 -------------------------------- */

export interface LabResultRow {
  id: string;
  reportNo: string | null;
  panelName: string | null;
  itemName: string;
  itemCode: string | null;
  specimen: string | null;
  value: string | null;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  abnormalFlag: string | null;
  isCritical: boolean;
  resultTime: string | null;
  visitId: string;
}

export interface ImagingReportRow {
  id: string;
  studyUid: string | null;
  modality: string | null;
  examName: string;
  bodyPart: string | null;
  findings: string | null;
  impression: string | null;
  aiFindings: unknown;
  isCritical: boolean;
  reportTime: string | null;
  visitId: string;
}

export interface LabInterpretationRow {
  id: string;
  visitId: string;
  department: string;
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: unknown;
  criticalItems: unknown;
  engineVersion: string;
  status: string;
  generatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

/* -------------------------------- 查询 -------------------------------- */

function labCond(patientId: string, visitId?: string): { sql: string; params: string[] } {
  return visitId
    ? { sql: 'WHERE patient_id = $1 AND visit_id = $2', params: [patientId, visitId] }
    : { sql: 'WHERE patient_id = $1', params: [patientId] };
}

export async function listLabResults(
  patientId: string,
  visitId?: string,
  db: DbExecutor = getDb(),
): Promise<LabResultRow[]> {
  const { sql, params } = labCond(patientId, visitId);
  const rows = await db.unsafe(
    `SELECT id, visit_id, report_no, panel_name, item_name, item_code, specimen,
            value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time
       FROM clinical.lab_results ${sql} ORDER BY result_time DESC, item_name`,
    params,
  );
  return rows.map((r) => ({
    id: String(r.id),
    reportNo: r.report_no != null ? String(r.report_no) : null,
    panelName: r.panel_name != null ? String(r.panel_name) : null,
    itemName: String(r.item_name),
    itemCode: r.item_code != null ? String(r.item_code) : null,
    specimen: r.specimen != null ? String(r.specimen) : null,
    value: r.value != null ? String(r.value) : null,
    unit: r.unit != null ? String(r.unit) : null,
    refLow: r.ref_low != null ? String(r.ref_low) : null,
    refHigh: r.ref_high != null ? String(r.ref_high) : null,
    abnormalFlag: r.abnormal_flag != null ? String(r.abnormal_flag) : null,
    isCritical: Boolean(r.is_critical),
    resultTime: r.result_time != null ? String(r.result_time) : null,
    visitId: String(r.visit_id),
  }));
}

export async function listImagingReports(
  patientId: string,
  visitId?: string,
  db: DbExecutor = getDb(),
): Promise<ImagingReportRow[]> {
  const { sql, params } = labCond(patientId, visitId);
  const rows = await db.unsafe(
    `SELECT id, visit_id, study_uid, modality, exam_name, body_part,
            findings, impression, ai_findings, is_critical, report_time
       FROM clinical.imaging_reports ${sql} ORDER BY report_time DESC`,
    params,
  );
  return rows.map((r) => ({
    id: String(r.id),
    studyUid: r.study_uid != null ? String(r.study_uid) : null,
    modality: r.modality != null ? String(r.modality) : null,
    examName: String(r.exam_name),
    bodyPart: r.body_part != null ? String(r.body_part) : null,
    findings: r.findings != null ? String(r.findings) : null,
    impression: r.impression != null ? String(r.impression) : null,
    aiFindings: r.ai_findings,
    isCritical: Boolean(r.is_critical),
    reportTime: r.report_time != null ? String(r.report_time) : null,
    visitId: String(r.visit_id),
  }));
}

export async function listLabInterpretations(
  patientId: string,
  visitId?: string,
  db: DbExecutor = getDb(),
): Promise<LabInterpretationRow[]> {
  const { sql, params } = labCond(patientId, visitId);
  const rows = await db.unsafe(
    `SELECT id, visit_id, department, item_count, abnormal_count, critical_count,
            summary, abnormal_items, critical_items, engine_version, status,
            generated_at, reviewed_by, reviewed_at
       FROM clinical.lab_interpretations ${sql} ORDER BY generated_at DESC`,
    params,
  );
  return rows.map((r) => ({
    id: String(r.id),
    visitId: String(r.visit_id),
    department: String(r.department),
    itemCount: Number(r.item_count),
    abnormalCount: Number(r.abnormal_count),
    criticalCount: Number(r.critical_count),
    summary: String(r.summary),
    abnormalItems: r.abnormal_items,
    criticalItems: r.critical_items,
    engineVersion: String(r.engine_version),
    status: String(r.status),
    generatedAt: String(r.generated_at),
    reviewedBy: r.reviewed_by != null ? String(r.reviewed_by) : null,
    reviewedAt: r.reviewed_at != null ? String(r.reviewed_at) : null,
  }));
}
