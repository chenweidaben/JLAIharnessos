/**
 * 健澜科技 jlmedaios - VTE 防治 Repository（M13-A）
 *
 * clinical.vte_assessments / vte_preventions / vte_outcomes 读写。
 *
 * 并发与一致性：
 *  - 评估按 assessment_no 唯一，同就诊多版本（当前 = 最新一条）；
 *  - 预防措施状态机以 CAS（status='suggested'）更新，重复确认/执行返回 null；
 *  - jsonb 一律以 tx.json(纯对象) 写入，禁止 JSON.stringify 字符串。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';
import type {
  VteScale,
  VteLevel,
  BleedingLevel,
  FactorItem,
  BleedingFactor,
} from '../../medical-tools/vte/vteRisk.js';

// ---------------------------------------------------------------------------
// 评估
// ---------------------------------------------------------------------------

export interface VteAssessment {
  id: string;
  visitId: string;
  patientId: string;
  department: string | null;
  assessmentNo: string;
  scale: VteScale;
  occasion: string;
  vteScore: number;
  vteLevel: VteLevel;
  vteFactors: FactorItem[];
  bleedingLevel: BleedingLevel;
  bleedingFactors: BleedingFactor[];
  alertRaised: boolean;
  version: number;
  assessedBy: string | null;
  assessedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const ASSESS_COLS = `
  id, visit_id, patient_id, department, assessment_no, scale, occasion, vte_score,
  vte_level, vte_factors, bleeding_level, bleeding_factors, alert_raised, version,
  assessed_by, assessed_at, note, created_at, updated_at
`;

function mapAssessment(row: Record<string, unknown>): VteAssessment {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    department: row.department ? String(row.department) : null,
    assessmentNo: String(row.assessment_no),
    scale: row.scale as VteScale,
    occasion: String(row.occasion),
    vteScore: Number(row.vte_score),
    vteLevel: row.vte_level as VteLevel,
    vteFactors: (row.vte_factors as FactorItem[]) ?? [],
    bleedingLevel: row.bleeding_level as BleedingLevel,
    bleedingFactors: (row.bleeding_factors as BleedingFactor[]) ?? [],
    alertRaised: Boolean(row.alert_raised),
    version: Number(row.version),
    assessedBy: row.assessed_by ? String(row.assessed_by) : null,
    assessedAt: row.assessed_at ? String(row.assessed_at) : null,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface VteAssessmentInput {
  visitId: string;
  patientId: string;
  department?: string | null;
  scale: VteScale;
  occasion: string;
  vteScore: number;
  vteLevel: VteLevel;
  vteFactors: FactorItem[];
  bleedingLevel: BleedingLevel;
  bleedingFactors: BleedingFactor[];
  alertRaised: boolean;
  version: number;
  assessedBy: string;
  note?: string | null;
}

function genAssessmentNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `VTEA${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

export async function createAssessment(input: VteAssessmentInput, tx: DbExecutor): Promise<VteAssessment> {
  const rows = await tx`
    INSERT INTO clinical.vte_assessments (
      visit_id, patient_id, department, assessment_no, scale, occasion, vte_score,
      vte_level, vte_factors, bleeding_level, bleeding_factors, alert_raised, version,
      assessed_by, assessed_at, note
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${input.department ?? null},
      ${genAssessmentNo()}, ${input.scale}, ${input.occasion}, ${input.vteScore},
      ${input.vteLevel}, ${tx.json(toJson(input.vteFactors))}, ${input.bleedingLevel},
      ${tx.json(toJson(input.bleedingFactors))}, ${input.alertRaised}, ${input.version},
      ${input.assessedBy}, now(), ${input.note ?? null}
    )
    RETURNING ${tx.unsafe(ASSESS_COLS)}`;
  return mapAssessment(rows[0] as Record<string, unknown>);
}

export async function getAssessmentById(id: string, sql?: DbExecutor): Promise<VteAssessment | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ASSESS_COLS)} FROM clinical.vte_assessments WHERE id = ${id}`;
  return rows.length > 0 ? mapAssessment(rows[0] as Record<string, unknown>) : null;
}

/** 某就诊最新一条评估（当前评估）。 */
export async function getLatestAssessmentByVisit(
  visitId: string, sql?: DbExecutor,
): Promise<VteAssessment | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ASSESS_COLS)} FROM clinical.vte_assessments
    WHERE visit_id = ${visitId}
    ORDER BY assessed_at DESC, created_at DESC LIMIT 1`;
  return rows.length > 0 ? mapAssessment(rows[0] as Record<string, unknown>) : null;
}

export async function listAssessments(
  filter: { visitId?: string; vteLevel?: string; occasion?: string } = {},
  sql?: DbExecutor,
): Promise<VteAssessment[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ASSESS_COLS)} FROM clinical.vte_assessments
    WHERE (${filter.visitId ?? ''} = '' OR visit_id = ${filter.visitId ?? ''})
      AND (${filter.vteLevel ?? ''} = '' OR vte_level = ${filter.vteLevel ?? ''})
      AND (${filter.occasion ?? ''} = '' OR occasion = ${filter.occasion ?? ''})
    ORDER BY assessed_at DESC, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapAssessment);
}

/**
 * 高危看板：各就诊最新一条评估，且层级为 high/very_high。
 * 用 DISTINCT ON 取每 visit 最新一条。
 */
export async function listHighRiskLatest(sql?: DbExecutor): Promise<VteAssessment[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT DISTINCT ON (visit_id) ${db.unsafe(ASSESS_COLS)}
    FROM clinical.vte_assessments
    WHERE vte_level IN ('high','very_high')
    ORDER BY visit_id, assessed_at DESC, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapAssessment);
}

/** 某就诊已有评估数量（用于版本号）。 */
export async function countAssessmentsByVisit(visitId: string, tx: DbExecutor): Promise<number> {
  const rows = await tx`SELECT count(*)::int AS n FROM clinical.vte_assessments WHERE visit_id = ${visitId}`;
  return Number((rows[0] as Record<string, unknown>).n) || 0;
}

// ---------------------------------------------------------------------------
// 预防措施
// ---------------------------------------------------------------------------

export type VtePreventionCategory = 'mechanical' | 'pharmacological';
export type VtePreventionStatus =
  | 'suggested' | 'confirmed' | 'executed' | 'contraindicated' | 'discontinued';

export interface VtePrevention {
  id: string;
  visitId: string;
  patientId: string;
  assessmentId: string | null;
  preventionNo: string;
  category: VtePreventionCategory;
  method: string;
  status: VtePreventionStatus;
  dosage: string | null;
  frequency: string | null;
  orderId: string | null;
  nursingTaskId: string | null;
  suggestedBy: string | null;
  confirmedBy: string | null;
  executedBy: string | null;
  confirmedAt: string | null;
  executedAt: string | null;
  contraindicationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const PREV_COLS = `
  id, visit_id, patient_id, assessment_id, prevention_no, category, method, status,
  dosage, frequency, order_id, nursing_task_id, suggested_by, confirmed_by, executed_by,
  confirmed_at, executed_at, contraindication_note, created_at, updated_at
`;

function mapPrevention(row: Record<string, unknown>): VtePrevention {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    assessmentId: row.assessment_id ? String(row.assessment_id) : null,
    preventionNo: String(row.prevention_no),
    category: row.category as VtePreventionCategory,
    method: String(row.method),
    status: row.status as VtePreventionStatus,
    dosage: row.dosage ? String(row.dosage) : null,
    frequency: row.frequency ? String(row.frequency) : null,
    orderId: row.order_id ? String(row.order_id) : null,
    nursingTaskId: row.nursing_task_id ? String(row.nursing_task_id) : null,
    suggestedBy: row.suggested_by ? String(row.suggested_by) : null,
    confirmedBy: row.confirmed_by ? String(row.confirmed_by) : null,
    executedBy: row.executed_by ? String(row.executed_by) : null,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    executedAt: row.executed_at ? String(row.executed_at) : null,
    contraindicationNote: row.contraindication_note ? String(row.contraindication_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface VtePreventionInput {
  visitId: string;
  patientId: string;
  assessmentId?: string | null;
  category: VtePreventionCategory;
  method: string;
  dosage?: string | null;
  frequency?: string | null;
  suggestedBy: string;
}

function genPreventionNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `VTEP${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

export async function createPrevention(input: VtePreventionInput, tx: DbExecutor): Promise<VtePrevention> {
  const rows = await tx`
    INSERT INTO clinical.vte_preventions (
      visit_id, patient_id, assessment_id, prevention_no, category, method, status,
      dosage, frequency, suggested_by
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${input.assessmentId ?? null},
      ${genPreventionNo()}, ${input.category}, ${input.method}, 'suggested',
      ${input.dosage ?? null}, ${input.frequency ?? null}, ${input.suggestedBy}
    )
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return mapPrevention(rows[0] as Record<string, unknown>);
}

export async function getPreventionById(id: string, sql?: DbExecutor): Promise<VtePrevention | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(PREV_COLS)} FROM clinical.vte_preventions WHERE id = ${id}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

export async function listPreventions(
  filter: { visitId?: string; status?: string; category?: string } = {},
  sql?: DbExecutor,
): Promise<VtePrevention[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(PREV_COLS)} FROM clinical.vte_preventions
    WHERE (${filter.visitId ?? ''} = '' OR visit_id = ${filter.visitId ?? ''})
      AND (${filter.status ?? ''} = '' OR status = ${filter.status ?? ''})
      AND (${filter.category ?? ''} = '' OR category = ${filter.category ?? ''})
    ORDER BY created_at ASC`;
  return (rows as Record<string, unknown>[]).map(mapPrevention);
}

/** 医师确认药物预防：suggested -> confirmed（CAS），绑定医嘱。 */
export async function confirmPrevention(
  id: string, confirmedBy: string, orderId: string, tx: DbExecutor,
): Promise<VtePrevention | null> {
  const rows = await tx`
    UPDATE clinical.vte_preventions
    SET status = 'confirmed', confirmed_by = ${confirmedBy}, order_id = ${orderId},
        confirmed_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'suggested'
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

/** 护士执行机械预防：suggested -> executed（CAS），绑定护理任务。 */
export async function executePrevention(
  id: string, executedBy: string, nursingTaskId: string, tx: DbExecutor,
): Promise<VtePrevention | null> {
  const rows = await tx`
    UPDATE clinical.vte_preventions
    SET status = 'executed', executed_by = ${executedBy}, nursing_task_id = ${nursingTaskId},
        executed_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'suggested'
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

/** 标记禁忌/停用。 */
export async function contraindicatePrevention(
  id: string, note: string, tx: DbExecutor,
): Promise<VtePrevention | null> {
  const rows = await tx`
    UPDATE clinical.vte_preventions
    SET status = 'contraindicated', contraindication_note = ${note}, updated_at = now()
    WHERE id = ${id} AND status IN ('suggested','confirmed')
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// 结局与不良事件
// ---------------------------------------------------------------------------

export interface VteOutcome {
  id: string;
  visitId: string;
  patientId: string;
  eventType: string;
  severity: string | null;
  source: string;
  imagingReportId: string | null;
  labResultId: string | null;
  description: string | null;
  recordedBy: string | null;
  occurredAt: string | null;
  createdAt: string;
}

const OUTCOME_COLS = `
  id, visit_id, patient_id, event_type, severity, source, imaging_report_id,
  lab_result_id, description, recorded_by, occurred_at, created_at
`;

function mapOutcome(row: Record<string, unknown>): VteOutcome {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    eventType: String(row.event_type),
    severity: row.severity ? String(row.severity) : null,
    source: String(row.source),
    imagingReportId: row.imaging_report_id ? String(row.imaging_report_id) : null,
    labResultId: row.lab_result_id ? String(row.lab_result_id) : null,
    description: row.description ? String(row.description) : null,
    recordedBy: row.recorded_by ? String(row.recorded_by) : null,
    occurredAt: row.occurred_at ? String(row.occurred_at) : null,
    createdAt: String(row.created_at),
  };
}

export interface VteOutcomeInput {
  visitId: string;
  patientId: string;
  eventType: string;
  severity?: string | null;
  source?: string;
  imagingReportId?: string | null;
  labResultId?: string | null;
  description?: string | null;
  recordedBy: string;
  occurredAt?: string | null;
}

export async function createOutcome(input: VteOutcomeInput, tx: DbExecutor): Promise<VteOutcome> {
  const rows = await tx`
    INSERT INTO clinical.vte_outcomes (
      visit_id, patient_id, event_type, severity, source, imaging_report_id,
      lab_result_id, description, recorded_by, occurred_at
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${input.eventType}, ${input.severity ?? null},
      ${input.source ?? 'hospital_acquired'}, ${input.imagingReportId ?? null},
      ${input.labResultId ?? null}, ${input.description ?? null}, ${input.recordedBy},
      ${input.occurredAt ?? null}
    )
    RETURNING ${tx.unsafe(OUTCOME_COLS)}`;
  return mapOutcome(rows[0] as Record<string, unknown>);
}

export async function listOutcomes(
  filter: { visitId?: string; eventType?: string } = {},
  sql?: DbExecutor,
): Promise<VteOutcome[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(OUTCOME_COLS)} FROM clinical.vte_outcomes
    WHERE (${filter.visitId ?? ''} = '' OR visit_id = ${filter.visitId ?? ''})
      AND (${filter.eventType ?? ''} = '' OR event_type = ${filter.eventType ?? ''})
    ORDER BY occurred_at DESC NULLS LAST, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapOutcome);
}
