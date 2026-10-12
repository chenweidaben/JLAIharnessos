/**
 * 健澜科技 jlmedaios - 护理风险预警 Repository（M17-A）
 *
 * clinical.nursing_risk_assessments / nursing_risk_preventions / nursing_risk_events 读写。
 *
 * 并发与一致性：
 *  - 评估按 assess_no 唯一，同就诊多版本（当前 = 最新一条）；
 *  - 预防措施状态机以 CAS 更新：suggested -> accepted -> executed，
 *    重复确认/执行/取消返回 null（WHERE 状态不匹配）；
 *  - jsonb 一律以 tx.json(纯对象) 写入，禁止 JSON.stringify 字符串。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';
import type { RiskType, RiskLevel } from '../../medical-tools/nursing/riskWarning.js';

// ---------------------------------------------------------------------------
// 评估
// ---------------------------------------------------------------------------

export interface NursingRiskAssessment {
  id: string;
  visitId: string;
  riskType: RiskType;
  assessNo: string;
  items: Record<string, unknown>;
  totalScore: number;
  level: RiskLevel;
  note: string | null;
  assessedBy: string | null;
  assessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const ASSESS_COLS = `
  id, visit_id, risk_type, assess_no, items, total_score, level, note,
  assessed_by, assessed_at, created_at, updated_at
`;

function mapAssessment(row: Record<string, unknown>): NursingRiskAssessment {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    riskType: row.risk_type as RiskType,
    assessNo: String(row.assess_no),
    items: (row.items as Record<string, unknown>) ?? {},
    totalScore: Number(row.total_score),
    level: row.level as RiskLevel,
    note: row.note ? String(row.note) : null,
    assessedBy: row.assessed_by ? String(row.assessed_by) : null,
    assessedAt: row.assessed_at ? String(row.assessed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface NursingRiskAssessmentInput {
  visitId: string;
  riskType: RiskType;
  items: Record<string, unknown>;
  totalScore: number;
  level: RiskLevel;
  note?: string | null;
  assessedBy: string;
}

function genAssessNo(riskType: RiskType): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = riskType === 'pressure_ulcer' ? 'PURA' : 'MORS';
  return `${prefix}${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

export async function createAssessment(input: NursingRiskAssessmentInput, tx: DbExecutor): Promise<NursingRiskAssessment> {
  const rows = await tx`
    INSERT INTO clinical.nursing_risk_assessments (
      visit_id, risk_type, assess_no, items, total_score, level, note, assessed_by
    ) VALUES (
      ${input.visitId}, ${input.riskType}, ${genAssessNo(input.riskType)},
      ${tx.json(toJson(input.items))}, ${input.totalScore}, ${input.level},
      ${input.note ?? null}, ${input.assessedBy}
    )
    RETURNING ${tx.unsafe(ASSESS_COLS)}`;
  return mapAssessment(rows[0] as Record<string, unknown>);
}

export async function getAssessmentById(id: string, sql?: DbExecutor): Promise<NursingRiskAssessment | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ASSESS_COLS)} FROM clinical.nursing_risk_assessments WHERE id = ${id}`;
  return rows.length > 0 ? mapAssessment(rows[0] as Record<string, unknown>) : null;
}

/** 某就诊某风险类型最新一条评估（当前评估）。 */
export async function getLatestAssessmentByVisit(
  visitId: string, riskType: RiskType, sql?: DbExecutor,
): Promise<NursingRiskAssessment | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ASSESS_COLS)} FROM clinical.nursing_risk_assessments
    WHERE visit_id = ${visitId} AND risk_type = ${riskType}
    ORDER BY assessed_at DESC, created_at DESC LIMIT 1`;
  return rows.length > 0 ? mapAssessment(rows[0] as Record<string, unknown>) : null;
}

export async function listAssessments(
  filter: { visitId?: string; riskType?: string; level?: string } = {},
  sql?: DbExecutor,
): Promise<NursingRiskAssessment[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ASSESS_COLS)} FROM clinical.nursing_risk_assessments
    WHERE (${filter.visitId ?? ''} = '' OR visit_id = ${filter.visitId ?? ''})
      AND (${filter.riskType ?? ''} = '' OR risk_type = ${filter.riskType ?? ''})
      AND (${filter.level ?? ''} = '' OR level = ${filter.level ?? ''})
    ORDER BY assessed_at DESC, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapAssessment);
}

/**
 * 高危看板：各 (visit, risk_type) 最新一条评估且层级为 high。
 * DISTINCT ON 取每 (visit_id, risk_type) 最新一条。
 */
export async function listHighRiskLatest(sql?: DbExecutor): Promise<NursingRiskAssessment[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT DISTINCT ON (visit_id, risk_type) ${db.unsafe(ASSESS_COLS)}
    FROM clinical.nursing_risk_assessments
    WHERE level = 'high'
    ORDER BY visit_id, risk_type, assessed_at DESC, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapAssessment);
}

// ---------------------------------------------------------------------------
// 预防措施（状态机：suggested -> accepted -> executed，可 cancelled）
// ---------------------------------------------------------------------------

export type PreventionStatus = 'suggested' | 'accepted' | 'executed' | 'cancelled';

export interface NursingRiskPrevention {
  id: string;
  assessmentId: string;
  measureCode: string;
  measureDesc: string;
  status: PreventionStatus;
  executedBy: string | null;
  executedAt: string | null;
  signature: string | null;
  createdAt: string;
  updatedAt: string;
}

const PREV_COLS = `
  id, assessment_id, measure_code, measure_desc, status,
  executed_by, executed_at, signature, created_at, updated_at
`;

function mapPrevention(row: Record<string, unknown>): NursingRiskPrevention {
  return {
    id: String(row.id),
    assessmentId: String(row.assessment_id),
    measureCode: String(row.measure_code),
    measureDesc: String(row.measure_desc),
    status: row.status as PreventionStatus,
    executedBy: row.executed_by ? String(row.executed_by) : null,
    executedAt: row.executed_at ? String(row.executed_at) : null,
    signature: row.signature ? String(row.signature) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface NursingRiskPreventionInput {
  assessmentId: string;
  measureCode: string;
  measureDesc: string;
}

export async function createPrevention(input: NursingRiskPreventionInput, tx: DbExecutor): Promise<NursingRiskPrevention> {
  const rows = await tx`
    INSERT INTO clinical.nursing_risk_preventions (assessment_id, measure_code, measure_desc, status)
    VALUES (${input.assessmentId}, ${input.measureCode}, ${input.measureDesc}, 'suggested')
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return mapPrevention(rows[0] as Record<string, unknown>);
}

export async function getPreventionById(id: string, sql?: DbExecutor): Promise<NursingRiskPrevention | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(PREV_COLS)} FROM clinical.nursing_risk_preventions WHERE id = ${id}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

export async function listPreventions(
  filter: { assessmentId?: string; visitId?: string; status?: string } = {},
  sql?: DbExecutor,
): Promise<NursingRiskPrevention[]> {
  const db = sql ?? getDb();
  // prevention 表无 visit_id，按 visit 过滤时经 assessment 关联；列名须全部加 p. 别名，否则 created_at/updated_at 跨表歧义
  if (filter.visitId) {
    const rows = await db`
      SELECT p.id, p.assessment_id, p.measure_code, p.measure_desc, p.status,
             p.executed_by, p.executed_at, p.signature, p.created_at, p.updated_at
      FROM clinical.nursing_risk_preventions p
      JOIN clinical.nursing_risk_assessments a ON a.id = p.assessment_id
      WHERE a.visit_id = ${filter.visitId}
        AND (${filter.status ?? ''} = '' OR p.status = ${filter.status ?? ''})
      ORDER BY p.created_at ASC`;
    return (rows as Record<string, unknown>[]).map(mapPrevention);
  }
  const rows = await db`
    SELECT ${db.unsafe(PREV_COLS)} FROM clinical.nursing_risk_preventions
    WHERE (${filter.assessmentId ?? ''} = '' OR assessment_id = ${filter.assessmentId ?? ''})
      AND (${filter.status ?? ''} = '' OR status = ${filter.status ?? ''})
    ORDER BY created_at ASC`;
  return (rows as Record<string, unknown>[]).map(mapPrevention);
}

/** 护士确认：suggested -> accepted（CAS）。 */
export async function acceptPrevention(id: string, tx: DbExecutor): Promise<NursingRiskPrevention | null> {
  const rows = await tx`
    UPDATE clinical.nursing_risk_preventions
    SET status = 'accepted', updated_at = now()
    WHERE id = ${id} AND status = 'suggested'
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

/**
 * 护士执行并本人签名：accepted -> executed（CAS）。
 * executed_by/executed_at/signature 一次性落库（本人签名才生效）。
 */
export async function executePrevention(
  id: string, executedBy: string, signature: string, tx: DbExecutor,
): Promise<NursingRiskPrevention | null> {
  const rows = await tx`
    UPDATE clinical.nursing_risk_preventions
    SET status = 'executed', executed_by = ${executedBy}, executed_at = now(),
        signature = ${signature}, updated_at = now()
    WHERE id = ${id} AND status = 'accepted'
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

/** 取消：suggested/accepted -> cancelled（CAS）。 */
export async function cancelPrevention(id: string, tx: DbExecutor): Promise<NursingRiskPrevention | null> {
  const rows = await tx`
    UPDATE clinical.nursing_risk_preventions
    SET status = 'cancelled', updated_at = now()
    WHERE id = ${id} AND status IN ('suggested','accepted')
    RETURNING ${tx.unsafe(PREV_COLS)}`;
  return rows.length > 0 ? mapPrevention(rows[0] as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// 结局 / 不良事件登记
// ---------------------------------------------------------------------------

export type RiskEventType = 'pressure_injury_stage2' | 'pressure_injury_stage3' | 'pressure_injury_stage4' | 'fall';

export interface NursingRiskEvent {
  id: string;
  visitId: string;
  riskType: RiskType;
  eventType: RiskEventType;
  description: string | null;
  recordedBy: string | null;
  occurredAt: string | null;
  createdAt: string;
}

const EVENT_COLS = `
  id, visit_id, risk_type, event_type, description, recorded_by, occurred_at, created_at
`;

function mapEvent(row: Record<string, unknown>): NursingRiskEvent {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    riskType: row.risk_type as RiskType,
    eventType: row.event_type as RiskEventType,
    description: row.description ? String(row.description) : null,
    recordedBy: row.recorded_by ? String(row.recorded_by) : null,
    occurredAt: row.occurred_at ? String(row.occurred_at) : null,
    createdAt: String(row.created_at),
  };
}

export interface NursingRiskEventInput {
  visitId: string;
  riskType: RiskType;
  eventType: RiskEventType;
  description?: string | null;
  recordedBy: string;
  occurredAt?: string | null;
}

export async function createEvent(input: NursingRiskEventInput, tx: DbExecutor): Promise<NursingRiskEvent> {
  const rows = await tx`
    INSERT INTO clinical.nursing_risk_events (
      visit_id, risk_type, event_type, description, recorded_by, occurred_at
    ) VALUES (
      ${input.visitId}, ${input.riskType}, ${input.eventType}, ${input.description ?? null},
      ${input.recordedBy}, ${input.occurredAt ?? tx`now()`}
    )
    RETURNING ${tx.unsafe(EVENT_COLS)}`;
  return mapEvent(rows[0] as Record<string, unknown>);
}

export async function listEvents(
  filter: { visitId?: string; riskType?: string; eventType?: string } = {},
  sql?: DbExecutor,
): Promise<NursingRiskEvent[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(EVENT_COLS)} FROM clinical.nursing_risk_events
    WHERE (${filter.visitId ?? ''} = '' OR visit_id = ${filter.visitId ?? ''})
      AND (${filter.riskType ?? ''} = '' OR risk_type = ${filter.riskType ?? ''})
      AND (${filter.eventType ?? ''} = '' OR event_type = ${filter.eventType ?? ''})
    ORDER BY occurred_at DESC NULLS LAST, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapEvent);
}
