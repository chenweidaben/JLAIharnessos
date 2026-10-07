/**
 * 健澜科技 jlmedaios - 临床用血质量 Repository（M10-B）
 *
 * clinical.transfusion_efficacy_assessments / blood_utilization_reviews 读写，
 * 以及从 clinical.lab_results 按时间窗匹配输注前后指标。
 *
 * 并发与一致性：
 *  - 疗效评估按 transfusion_id 唯一，幂等 upsert；
 *  - 合理性评价按 request_id 唯一，幂等 upsert；
 *  - 关联输注的状态判定在聚合器内对申请/输注加锁，本层只负责持久化。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { EfficacyGrade, UtilizationConclusion } from '../../medical-tools/quality/bloodUtilizationQuality.js';

// ---------------------------------------------------------------------------
// 疗效评估
// ---------------------------------------------------------------------------

export interface EfficacyAssessment {
  id: string;
  transfusionId: string;
  requestId: string;
  visitId: string;
  patientId: string;
  assessedBy: string | null;
  component: string;
  preMetric: number | null;
  postMetric: number | null;
  metricUnit: string | null;
  expectedDelta: number | null;
  actualDelta: number | null;
  efficacyGrade: EfficacyGrade;
  preResultId: string | null;
  postResultId: string | null;
  note: string | null;
  assessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const EFF_COLS = `
  id, transfusion_id, request_id, visit_id, patient_id, assessed_by, component,
  pre_metric, post_metric, metric_unit, expected_delta, actual_delta, efficacy_grade,
  pre_result_id, post_result_id, note, assessed_at, created_at, updated_at
`;

function mapEff(row: Record<string, unknown>): EfficacyAssessment {
  const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  return {
    id: String(row.id),
    transfusionId: String(row.transfusion_id),
    requestId: String(row.request_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    assessedBy: row.assessed_by ? String(row.assessed_by) : null,
    component: String(row.component),
    preMetric: numOrNull(row.pre_metric),
    postMetric: numOrNull(row.post_metric),
    metricUnit: row.metric_unit ? String(row.metric_unit) : null,
    expectedDelta: numOrNull(row.expected_delta),
    actualDelta: numOrNull(row.actual_delta),
    efficacyGrade: row.efficacy_grade as EfficacyGrade,
    preResultId: row.pre_result_id ? String(row.pre_result_id) : null,
    postResultId: row.post_result_id ? String(row.post_result_id) : null,
    note: row.note ? String(row.note) : null,
    assessedAt: row.assessed_at ? String(row.assessed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface EfficacyInput {
  transfusionId: string;
  requestId: string;
  visitId: string;
  patientId: string;
  assessedBy: string;
  component: string;
  preMetric: number | null;
  postMetric: number | null;
  metricUnit: string;
  expectedDelta: number;
  actualDelta: number | null;
  efficacyGrade: EfficacyGrade;
  preResultId: string | null;
  postResultId: string | null;
  note?: string | null;
}

/** 幂等写入疗效评估（同一 transfusion 重新评估则更新）。返回记录与是否首次创建。 */
export async function upsertEfficacy(
  input: EfficacyInput,
  tx: DbExecutor,
): Promise<{ assessment: EfficacyAssessment; created: boolean }> {
  const existing = await tx`
    SELECT id FROM clinical.transfusion_efficacy_assessments WHERE transfusion_id = ${input.transfusionId}`;
  const created = existing.length === 0;
  const rows = await tx`
    INSERT INTO clinical.transfusion_efficacy_assessments
      (transfusion_id, request_id, visit_id, patient_id, assessed_by, component,
       pre_metric, post_metric, metric_unit, expected_delta, actual_delta, efficacy_grade,
       pre_result_id, post_result_id, note, assessed_at)
    VALUES
      (${input.transfusionId}, ${input.requestId}, ${input.visitId}, ${input.patientId},
       ${input.assessedBy}, ${input.component}, ${input.preMetric}, ${input.postMetric},
       ${input.metricUnit}, ${input.expectedDelta}, ${input.actualDelta}, ${input.efficacyGrade},
       ${input.preResultId}, ${input.postResultId}, ${input.note ?? null}, now())
    ON CONFLICT (transfusion_id) DO UPDATE SET
      assessed_by = EXCLUDED.assessed_by,
      pre_metric = EXCLUDED.pre_metric,
      post_metric = EXCLUDED.post_metric,
      metric_unit = EXCLUDED.metric_unit,
      expected_delta = EXCLUDED.expected_delta,
      actual_delta = EXCLUDED.actual_delta,
      efficacy_grade = EXCLUDED.efficacy_grade,
      pre_result_id = EXCLUDED.pre_result_id,
      post_result_id = EXCLUDED.post_result_id,
      note = EXCLUDED.note,
      assessed_at = now(),
      updated_at = now()
    RETURNING ${tx.unsafe(EFF_COLS)}`;
  return { assessment: mapEff(rows[0] as Record<string, unknown>), created };
}

export async function getEfficacyByTransfusion(
  transfusionId: string,
  sql?: DbExecutor,
): Promise<EfficacyAssessment | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(EFF_COLS)} FROM clinical.transfusion_efficacy_assessments
    WHERE transfusion_id = ${transfusionId}`;
  return rows.length > 0 ? mapEff(rows[0] as Record<string, unknown>) : null;
}

export async function listEfficacy(
  filter: { grade?: string } = {},
  sql?: DbExecutor,
): Promise<EfficacyAssessment[]> {
  const db = sql ?? getDb();
  if (filter.grade) {
    const rows = await db`
      SELECT ${db.unsafe(EFF_COLS)} FROM clinical.transfusion_efficacy_assessments
      WHERE efficacy_grade = ${filter.grade} ORDER BY assessed_at DESC NULLS LAST`;
    return rows.map((r: Record<string, unknown>) => mapEff(r));
  }
  const rows = await db`
    SELECT ${db.unsafe(EFF_COLS)} FROM clinical.transfusion_efficacy_assessments
    ORDER BY assessed_at DESC NULLS LAST`;
  return rows.map((r: Record<string, unknown>) => mapEff(r));
}

// ---------------------------------------------------------------------------
// 用血合理性评价
// ---------------------------------------------------------------------------

export interface UtilizationReview {
  id: string;
  requestId: string;
  visitId: string;
  patientId: string;
  reviewedBy: string | null;
  indicationCompliant: boolean;
  dosageCompliant: boolean;
  preTestComplete: boolean;
  efficacyGrade: EfficacyGrade | null;
  conclusion: UtilizationConclusion;
  issues: string[];
  conclusionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const UTIL_COLS = `
  id, request_id, visit_id, patient_id, reviewed_by, indication_compliant, dosage_compliant,
  pre_test_complete, efficacy_grade, conclusion, issues, conclusion_note, reviewed_at,
  created_at, updated_at
`;

function mapUtil(row: Record<string, unknown>): UtilizationReview {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    indicationCompliant: Boolean(row.indication_compliant),
    dosageCompliant: Boolean(row.dosage_compliant),
    preTestComplete: Boolean(row.pre_test_complete),
    efficacyGrade: row.efficacy_grade ? (row.efficacy_grade as EfficacyGrade) : null,
    conclusion: row.conclusion as UtilizationConclusion,
    issues: (row.issues ?? []) as string[],
    conclusionNote: row.conclusion_note ? String(row.conclusion_note) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface UtilizationInput {
  requestId: string;
  visitId: string;
  patientId: string;
  reviewedBy: string;
  indicationCompliant: boolean;
  dosageCompliant: boolean;
  preTestComplete: boolean;
  efficacyGrade: EfficacyGrade | null;
  conclusion: UtilizationConclusion;
  issues: string[];
  conclusionNote?: string | null;
}

export async function upsertUtilization(
  input: UtilizationInput,
  tx: DbExecutor,
): Promise<{ review: UtilizationReview; created: boolean }> {
  const existing = await tx`
    SELECT id FROM clinical.blood_utilization_reviews WHERE request_id = ${input.requestId}`;
  const created = existing.length === 0;
  const rows = await tx`
    INSERT INTO clinical.blood_utilization_reviews
      (request_id, visit_id, patient_id, reviewed_by, indication_compliant, dosage_compliant,
       pre_test_complete, efficacy_grade, conclusion, issues, conclusion_note, reviewed_at)
    VALUES
      (${input.requestId}, ${input.visitId}, ${input.patientId}, ${input.reviewedBy},
       ${input.indicationCompliant}, ${input.dosageCompliant}, ${input.preTestComplete},
       ${input.efficacyGrade}, ${input.conclusion}, ${input.issues}::jsonb,
       ${input.conclusionNote ?? null}, now())
    ON CONFLICT (request_id) DO UPDATE SET
      reviewed_by = EXCLUDED.reviewed_by,
      indication_compliant = EXCLUDED.indication_compliant,
      dosage_compliant = EXCLUDED.dosage_compliant,
      pre_test_complete = EXCLUDED.pre_test_complete,
      efficacy_grade = EXCLUDED.efficacy_grade,
      conclusion = EXCLUDED.conclusion,
      issues = EXCLUDED.issues,
      conclusion_note = EXCLUDED.conclusion_note,
      reviewed_at = now(),
      updated_at = now()
    RETURNING ${tx.unsafe(UTIL_COLS)}`;
  return { review: mapUtil(rows[0] as Record<string, unknown>), created };
}

export async function getUtilizationByRequest(
  requestId: string,
  sql?: DbExecutor,
): Promise<UtilizationReview | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(UTIL_COLS)} FROM clinical.blood_utilization_reviews
    WHERE request_id = ${requestId}`;
  return rows.length > 0 ? mapUtil(rows[0] as Record<string, unknown>) : null;
}

export async function listUtilization(
  filter: { conclusion?: string } = {},
  sql?: DbExecutor,
): Promise<UtilizationReview[]> {
  const db = sql ?? getDb();
  if (filter.conclusion) {
    const rows = await db`
      SELECT ${db.unsafe(UTIL_COLS)} FROM clinical.blood_utilization_reviews
      WHERE conclusion = ${filter.conclusion} ORDER BY reviewed_at DESC NULLS LAST`;
    return rows.map((r: Record<string, unknown>) => mapUtil(r));
  }
  const rows = await db`
    SELECT ${db.unsafe(UTIL_COLS)} FROM clinical.blood_utilization_reviews
    ORDER BY reviewed_at DESC NULLS LAST`;
  return rows.map((r: Record<string, unknown>) => mapUtil(r));
}

// ---------------------------------------------------------------------------
// 输注前后指标匹配（lab_results）
// ---------------------------------------------------------------------------

export interface MetricPoint {
  resultId: string;
  value: number;
  resultTime: string;
}

function buildLike(patterns: string[]): string[] {
  return patterns.map((p) => `%${p}%`);
}

/**
 * 取某时间点之前最近的指标（输注前基线）。
 * patterns 为 item_code/item_name 的匹配关键词（大小写不敏感）。
 */
export async function findMetricBefore(
  patientId: string,
  patterns: string[],
  beforeIso: string,
  sql?: DbExecutor,
): Promise<MetricPoint | null> {
  const db = sql ?? getDb();
  const like = buildLike(patterns);
  const rows = await db`
    SELECT id, numeric_value, value, result_time
    FROM clinical.lab_results
    WHERE patient_id = ${patientId}
      AND result_time < ${beforeIso}
      AND (item_code ILIKE ANY(${like}) OR item_name ILIKE ANY(${like}))
    ORDER BY result_time DESC
    LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  const v = r.numeric_value !== null ? Number(r.numeric_value) : Number.parseFloat(String(r.value));
  return { resultId: String(r.id), value: Number.isFinite(v) ? v : NaN, resultTime: String(r.result_time) };
}

/**
 * 取某时间点之后、给定小时窗内的指标（输注后复查），取最早一次。
 */
export async function findMetricAfter(
  patientId: string,
  patterns: string[],
  afterIso: string,
  windowHours: number,
  sql?: DbExecutor,
): Promise<MetricPoint | null> {
  const db = sql ?? getDb();
  const like = buildLike(patterns);
  const rows = await db`
    SELECT id, numeric_value, value, result_time
    FROM clinical.lab_results
    WHERE patient_id = ${patientId}
      AND result_time > ${afterIso}
      AND result_time <= ${afterIso}::timestamptz + make_interval(hours => ${windowHours})
      AND (item_code ILIKE ANY(${like}) OR item_name ILIKE ANY(${like}))
    ORDER BY result_time ASC
    LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  const v = r.numeric_value !== null ? Number(r.numeric_value) : Number.parseFloat(String(r.value));
  return { resultId: String(r.id), value: Number.isFinite(v) ? v : NaN, resultTime: String(r.result_time) };
}
