/**
 * 健澜科技 jlmedaios - 影像报告 AI 解读 Repository（M12-A）
 *
 * clinical.imaging_interpretations 读写 + 读取已发布影像报告。
 *
 * 并发与一致性：
 *  - 重新生成：ON CONFLICT (report_id, audience) DO UPDATE，同一报告同一视角只覆盖一行；
 *  - 签名/退回：FOR UPDATE 行锁 + 源状态白名单（pending_review -> signed/rejected）；
 *  - DataScope 在聚合器按 department（放射科）过滤。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';
import type { Audience, DeepSource, LlmStatus } from '../../medical-tools/interpret/interpretEngine.js';

export type ImagingInterpStatus = 'pending_review' | 'signed' | 'rejected';

/** 影像报告（供解读）。报告须 status='published' 方可解读。 */
export interface ImagingReportRow {
  id: string;
  visitId: string;
  patientId: string;
  modality: string | null;
  examName: string;
  bodyPart: string | null;
  findings: string | null;
  impression: string | null;
  status: string;
  reportTime: string | null;
}

export interface ImagingInterpretation {
  id: string;
  reportId: string;
  visitId: string;
  patientId: string;
  department: string;
  audience: Audience;
  modality: string | null;
  examName: string;
  bodyPart: string | null;
  explainedFindings: Record<string, unknown>[];
  overallDirection: string | null;
  plainLanguageSummary: string | null;
  recommendations: Record<string, unknown>[];
  deepSource: DeepSource;
  model: string | null;
  llmStatus: LlmStatus;
  status: ImagingInterpStatus;
  generatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const COLS = `
  id, report_id, visit_id, patient_id, department, audience,
  modality, exam_name, body_part,
  explained_findings, overall_direction, plain_language_summary, recommendations,
  deep_source, model, llm_status,
  status, generated_at, reviewed_by, reviewed_at, reject_reason,
  created_at, updated_at
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

function mapRow(row: Record<string, unknown>): ImagingInterpretation {
  return {
    id: String(row.id),
    reportId: String(row.report_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    department: String(row.department),
    audience: (row.audience as Audience) ?? 'doctor',
    modality: row.modality ? String(row.modality) : null,
    examName: String(row.exam_name),
    bodyPart: row.body_part ? String(row.body_part) : null,
    explainedFindings: asArr(row.explained_findings),
    overallDirection: row.overall_direction ? String(row.overall_direction) : null,
    plainLanguageSummary: row.plain_language_summary ? String(row.plain_language_summary) : null,
    recommendations: asArr(row.recommendations),
    deepSource: (row.deep_source as DeepSource) ?? 'rule',
    model: row.model ? String(row.model) : null,
    llmStatus: (row.llm_status as LlmStatus) ?? 'rule_only',
    status: row.status as ImagingInterpStatus,
    generatedAt: String(row.generated_at),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ------------------------------ 影像报告读取 ------------------------------ */

export async function getImagingReport(
  reportId: string,
  sql?: DbExecutor,
): Promise<ImagingReportRow | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id, visit_id, patient_id, modality, exam_name, body_part,
           findings, impression, status, report_time
    FROM clinical.imaging_reports
    WHERE id = ${reportId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: String(r.id),
    visitId: String(r.visit_id),
    patientId: String(r.patient_id),
    modality: r.modality ? String(r.modality) : null,
    examName: String(r.exam_name),
    bodyPart: r.body_part ? String(r.body_part) : null,
    findings: r.findings ? String(r.findings) : null,
    impression: r.impression ? String(r.impression) : null,
    status: String(r.status),
    reportTime: r.report_time ? String(r.report_time) : null,
  };
}

/* --------------------------- 幂等解读草稿写入 --------------------------- */

export interface ImagingInterpUpsertInput {
  reportId: string;
  visitId: string;
  patientId: string;
  department?: string;
  audience?: Audience;
  modality?: string | null;
  examName: string;
  bodyPart?: string | null;
  explainedFindings?: Record<string, unknown>[];
  overallDirection?: string | null;
  plainLanguageSummary?: string | null;
  recommendations?: Record<string, unknown>[];
  deepSource?: DeepSource;
  model?: string | null;
  llmStatus?: LlmStatus;
}

/** 幂等写入影像解读草稿：同一 (report_id, audience) 重新生成覆盖，状态重置 pending_review。 */
export async function upsertImagingInterpretation(
  input: ImagingInterpUpsertInput,
  tx: DbExecutor,
): Promise<ImagingInterpretation> {
  const audience: Audience = input.audience ?? 'doctor';
  const rows = await tx`
    INSERT INTO clinical.imaging_interpretations (
      report_id, visit_id, patient_id, department, audience,
      modality, exam_name, body_part,
      explained_findings, overall_direction, plain_language_summary, recommendations,
      deep_source, model, llm_status, status
    ) VALUES (
      ${input.reportId}, ${input.visitId}, ${input.patientId},
      ${input.department ?? '放射科'}, ${audience},
      ${input.modality ?? null}, ${input.examName}, ${input.bodyPart ?? null},
      ${tx.json(toJson(input.explainedFindings ?? []))},
      ${input.overallDirection ?? null},
      ${input.plainLanguageSummary ?? null},
      ${tx.json(toJson(input.recommendations ?? []))},
      ${input.deepSource ?? 'rule'}, ${input.model ?? null}, ${input.llmStatus ?? 'rule_only'},
      'pending_review'
    )
    ON CONFLICT (report_id, audience) DO UPDATE SET
      explained_findings = EXCLUDED.explained_findings,
      overall_direction = EXCLUDED.overall_direction,
      plain_language_summary = EXCLUDED.plain_language_summary,
      recommendations = EXCLUDED.recommendations,
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

export async function getByReport(
  reportId: string,
  audience: Audience = 'doctor',
  sql?: DbExecutor,
): Promise<ImagingInterpretation | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.imaging_interpretations
    WHERE report_id = ${reportId} AND audience = ${audience}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getById(
  id: string,
  sql?: DbExecutor,
): Promise<ImagingInterpretation | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.imaging_interpretations WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export interface ImagingInterpListRow {
  id: string;
  reportId: string;
  visitId: string;
  patientId: string;
  department: string;
  examName: string;
  status: ImagingInterpStatus;
  audience: Audience;
  updatedAt: string;
}

export async function listImagingInterpretations(
  status: ImagingInterpStatus | null,
  audience: Audience | null = null,
  sql?: DbExecutor,
): Promise<ImagingInterpListRow[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT r.id, r.report_id, r.visit_id, r.patient_id, r.department,
           r.exam_name, r.status, r.audience, r.updated_at
    FROM clinical.imaging_interpretations r
    WHERE (${status ?? null}::text IS NULL OR r.status = ${status ?? null})
      AND (${audience ?? null}::text IS NULL OR r.audience = ${audience ?? null})
    ORDER BY r.updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    reportId: String(r.report_id),
    visitId: String(r.visit_id),
    patientId: String(r.patient_id),
    department: String(r.department),
    examName: String(r.exam_name),
    status: r.status as ImagingInterpStatus,
    audience: (r.audience as Audience) ?? 'doctor',
    updatedAt: String(r.updated_at),
  }));
}

/* --------------------------- 条件式签名/退回 --------------------------- */

/** FOR UPDATE 行锁 + 源状态白名单：pending_review -> signed/rejected。0 行返回 null。 */
export async function setStatus(
  id: string,
  fromStatuses: ImagingInterpStatus[],
  toStatus: Exclude<ImagingInterpStatus, 'pending_review'>,
  opts: { reviewedBy?: string; rejectReason?: string | null },
  tx: DbExecutor,
): Promise<ImagingInterpretation | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.imaging_interpretations
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapRow(locked[0] as Record<string, unknown>);
  if (!fromStatuses.includes(current.status)) return null;

  const rows = await tx`
    UPDATE clinical.imaging_interpretations SET
      status = ${toStatus},
      reviewed_by = ${opts.reviewedBy ?? null},
      reviewed_at = now(),
      reject_reason = ${opts.rejectReason ?? null}
    WHERE id = ${id}
    RETURNING ${tx.unsafe(COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}
