/**
 * 健澜科技 jlmedaios - 检验 AI 辅助解读 Repository（M3-E）
 *
 * clinical.lab_interpretations 读写 + 读取就诊原始检验结果。
 *
 * 并发与一致性：
 *  - 重新生成：ON CONFLICT (visit_id) DO UPDATE，同一就诊重复生成只覆盖一行；
 *  - 签名/退回：FOR UPDATE 行锁 + 源状态白名单（pending_review -> signed/rejected）；
 *  - DataScope 在聚合器按 department 过滤。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';
import type { Audience, DeepSource, LlmStatus } from '../../medical-tools/interpret/interpretEngine.js';

export type LabInterpStatus = 'pending_review' | 'signed' | 'rejected';

export interface LabResultRow {
  id: string;
  itemName: string;
  itemCode: string | null;
  value: string | null;
  numericValue: string | null;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  abnormalFlag: string | null;
  isCritical: boolean;
  resultTime: string | null;
}

export interface LabInterpretation {
  id: string;
  visitId: string;
  patientId: string;
  department: string;
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: Record<string, unknown>[];
  criticalItems: Record<string, unknown>[];
  engineVersion: string;
  status: LabInterpStatus;
  generatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  // M12-A 新增列
  audience: Audience;
  deepSource: DeepSource;
  model: string | null;
  overallImpression: string | null;
  itemExplanations: Record<string, unknown>[];
  trends: Record<string, unknown>[];
  recommendations: Record<string, unknown>[];
  plainLanguageSummary: string | null;
  llmStatus: LlmStatus;
}

const COLS = `
  id, visit_id, patient_id, department,
  item_count, abnormal_count, critical_count, summary,
  abnormal_items, critical_items, engine_version,
  status, generated_at, reviewed_by, reviewed_at, reject_reason,
  created_at, updated_at,
  audience, deep_source, model, overall_impression,
  item_explanations, trends, recommendations, plain_language_summary, llm_status
`;

function asArr(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (typeof v === 'string' && v.trim()) {
    try {
      const p: unknown = JSON.parse(v);
      return Array.isArray(p) ? (p as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapRow(row: Record<string, unknown>): LabInterpretation {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    department: String(row.department),
    itemCount: Number(row.item_count),
    abnormalCount: Number(row.abnormal_count),
    criticalCount: Number(row.critical_count),
    summary: String(row.summary),
    abnormalItems: asArr(row.abnormal_items),
    criticalItems: asArr(row.critical_items),
    engineVersion: String(row.engine_version),
    status: row.status as LabInterpStatus,
    generatedAt: String(row.generated_at),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    audience: (row.audience as Audience) ?? 'doctor',
    deepSource: (row.deep_source as DeepSource) ?? 'rule',
    model: row.model ? String(row.model) : null,
    overallImpression: row.overall_impression ? String(row.overall_impression) : null,
    itemExplanations: asArr(row.item_explanations),
    trends: asArr(row.trends),
    recommendations: asArr(row.recommendations),
    plainLanguageSummary: row.plain_language_summary ? String(row.plain_language_summary) : null,
    llmStatus: (row.llm_status as LlmStatus) ?? 'rule_only',
  };
}

/* --------------------------- 就诊原始检验结果 --------------------------- */

export async function listLabResultsByVisit(
  visitId: string,
  sql?: DbExecutor,
): Promise<LabResultRow[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id, item_name, item_code, value, numeric_value, unit,
           ref_low, ref_high, abnormal_flag, is_critical, result_time::text AS result_time
    FROM clinical.lab_results
    WHERE visit_id = ${visitId}
    ORDER BY result_time ASC, created_at ASC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    itemName: String(r.item_name),
    itemCode: r.item_code ? String(r.item_code) : null,
    value: r.value != null ? String(r.value) : null,
    numericValue: r.numeric_value != null ? String(r.numeric_value) : null,
    unit: r.unit ? String(r.unit) : null,
    refLow: r.ref_low != null ? String(r.ref_low) : null,
    refHigh: r.ref_high != null ? String(r.ref_high) : null,
    abnormalFlag: r.abnormal_flag ? String(r.abnormal_flag) : null,
    isCritical: Boolean(r.is_critical),
    resultTime: r.result_time ? String(r.result_time) : null,
  }));
}

/* --------------------------- 患者历史结果（趋势用） --------------------------- */

export interface LabHistoryRow {
  itemCode: string | null;
  itemName: string;
  numericValue: string | null;
  unit: string | null;
  resultTime: string | null;
}

/**
 * 拉取某患者在 beforeTime 之前的历史数值结果（升序），供确定性趋势对比。
 * 仅取有 item_code 与 numeric_value 的行；不含本次（result_time < beforeTime）。
 */
export async function listLabHistoryByPatient(
  patientId: string,
  beforeTime: string,
  limit = 500,
  sql?: DbExecutor,
): Promise<LabHistoryRow[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT item_code, item_name, numeric_value, unit, result_time::text AS result_time
    FROM clinical.lab_results
    WHERE patient_id = ${patientId}
      AND result_time < ${beforeTime}
      AND numeric_value IS NOT NULL
      AND item_code IS NOT NULL
    ORDER BY result_time ASC
    LIMIT ${limit}
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    itemCode: r.item_code ? String(r.item_code) : null,
    itemName: String(r.item_name),
    numericValue: r.numeric_value != null ? String(r.numeric_value) : null,
    unit: r.unit ? String(r.unit) : null,
    resultTime: r.result_time ? String(r.result_time) : null,
  }));
}

/* --------------------------- 幂等解读草稿写入 --------------------------- */

export interface InterpUpsertInput {
  visitId: string;
  patientId: string;
  department: string;
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: Record<string, unknown>[];
  criticalItems: Record<string, unknown>[];
  engineVersion: string;
  // M12-A 新增（可选，向后兼容 M3-E 旧调用）
  audience?: Audience;
  overallImpression?: string | null;
  itemExplanations?: Record<string, unknown>[];
  trends?: Record<string, unknown>[];
  recommendations?: Record<string, unknown>[];
  plainLanguageSummary?: string | null;
  deepSource?: DeepSource;
  model?: string | null;
  llmStatus?: LlmStatus;
}

/** 幂等写入解读草稿：同一 (visit_id, audience) 重新生成覆盖业务字段，状态重置 pending_review。 */
export async function upsertInterpretation(
  input: InterpUpsertInput,
  tx: DbExecutor,
): Promise<LabInterpretation> {
  const audience: Audience = input.audience ?? 'doctor';
  const rows = await tx`
    INSERT INTO clinical.lab_interpretations (
      visit_id, patient_id, department,
      item_count, abnormal_count, critical_count, summary,
      abnormal_items, critical_items, engine_version, status,
      audience, overall_impression, item_explanations, trends, recommendations,
      plain_language_summary, deep_source, model, llm_status
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${input.department},
      ${input.itemCount}, ${input.abnormalCount}, ${input.criticalCount}, ${input.summary},
      ${tx.json(toJson(input.abnormalItems))}, ${tx.json(toJson(input.criticalItems))},
      ${input.engineVersion}, 'pending_review',
      ${audience}, ${input.overallImpression ?? null},
      ${tx.json(toJson(input.itemExplanations ?? []))},
      ${tx.json(toJson(input.trends ?? []))},
      ${tx.json(toJson(input.recommendations ?? []))},
      ${input.plainLanguageSummary ?? null},
      ${input.deepSource ?? 'rule'}, ${input.model ?? null}, ${input.llmStatus ?? 'rule_only'}
    )
    ON CONFLICT (visit_id, audience) DO UPDATE SET
      item_count = EXCLUDED.item_count,
      abnormal_count = EXCLUDED.abnormal_count,
      critical_count = EXCLUDED.critical_count,
      summary = EXCLUDED.summary,
      abnormal_items = EXCLUDED.abnormal_items,
      critical_items = EXCLUDED.critical_items,
      engine_version = EXCLUDED.engine_version,
      overall_impression = EXCLUDED.overall_impression,
      item_explanations = EXCLUDED.item_explanations,
      trends = EXCLUDED.trends,
      recommendations = EXCLUDED.recommendations,
      plain_language_summary = EXCLUDED.plain_language_summary,
      deep_source = EXCLUDED.deep_source,
      model = EXCLUDED.model,
      llm_status = EXCLUDED.llm_status,
      status = 'pending_review',
      generated_at = now(),
      reviewed_by = NULL,
      reviewed_at = NULL,
      reject_reason = NULL
    RETURNING ${tx.unsafe(COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

/* -------------------------------- 查询 -------------------------------- */

export async function getByVisit(
  visitId: string,
  audience: Audience = 'doctor',
  sql?: DbExecutor,
): Promise<LabInterpretation | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.lab_interpretations
    WHERE visit_id = ${visitId} AND audience = ${audience}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getById(id: string, sql?: DbExecutor): Promise<LabInterpretation | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.lab_interpretations WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export interface InterpListRow {
  id: string;
  visitId: string;
  visitNo: string;
  patientName: string;
  department: string;
  abnormalCount: number;
  criticalCount: number;
  status: LabInterpStatus;
  audience: Audience;
  updatedAt: string;
}

export async function listInterpretations(
  status: LabInterpStatus | null,
  audience: Audience | null = null,
  sql?: DbExecutor,
): Promise<InterpListRow[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT r.id, r.visit_id, v.visit_no, p.name_masked, r.department,
           r.abnormal_count, r.critical_count, r.status, r.audience, r.updated_at
    FROM clinical.lab_interpretations r
    JOIN clinical.visits v ON v.id = r.visit_id
    JOIN clinical.patients p ON p.id = r.patient_id
    WHERE (${status ?? null}::text IS NULL OR r.status = ${status ?? null})
      AND (${audience ?? null}::text IS NULL OR r.audience = ${audience ?? null})
    ORDER BY r.updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    visitId: String(r.visit_id),
    visitNo: String(r.visit_no),
    patientName: String(r.name_masked),
    department: String(r.department),
    abnormalCount: Number(r.abnormal_count),
    criticalCount: Number(r.critical_count),
    status: r.status as LabInterpStatus,
    audience: (r.audience as Audience) ?? 'doctor',
    updatedAt: String(r.updated_at),
  }));
}

/* --------------------------- 条件式签名/退回 --------------------------- */

/** FOR UPDATE 行锁 + 源状态白名单：pending_review -> signed/rejected。0 行返回 null。 */
export async function setStatus(
  id: string,
  fromStatuses: LabInterpStatus[],
  toStatus: Exclude<LabInterpStatus, 'pending_review'>,
  opts: { reviewedBy?: string; rejectReason?: string | null },
  tx: DbExecutor,
): Promise<LabInterpretation | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.lab_interpretations
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapRow(locked[0] as Record<string, unknown>);
  if (!fromStatuses.includes(current.status)) return null;

  const rows = await tx`
    UPDATE clinical.lab_interpretations SET
      status = ${toStatus},
      reviewed_by = ${opts.reviewedBy ?? null},
      reviewed_at = now(),
      reject_reason = ${opts.rejectReason ?? null}
    WHERE id = ${id}
    RETURNING ${tx.unsafe(COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/* -------------------------------- 计数 -------------------------------- */

export async function countInterpretations(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ n: number }[]>`SELECT count(*) AS n FROM clinical.lab_interpretations`;
  return Number(rows[0]?.n ?? 0);
}
