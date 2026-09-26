/**
 * 健澜科技 jlmedaios - 护理 Repository（M1-B2）
 * 覆盖护理记录单（clinical.nursing_records）与护理任务（clinical.nursing_tasks）。
 *
 * 状态机：
 *  - 护理记录：draft ──sign(责任护士本人签名)──► signed；
 *  - 护理任务：pending ──execute(责任护士，CAS + 幂等键)──► done；
 *      pending ──cancel──► cancelled。
 *
 * 严谨性：
 *  - 护理记录必须本人签名（signed_by=nurse_id），AI 仅辅助；
 *  - 护理任务并发执行以 CAS（status='pending'）+ idempotency_key 唯一约束双重兜底，
 *      保证不重复执行；
 *  - 护理级别（特级/一级/二级/三级）与压疮(Braden)/跌倒(Morse)风险评估强制记录。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type NursingLevel = 'special' | 'level1' | 'level2' | 'level3';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type NursingShift = 'day' | 'night';
export type NursingTaskType =
  | 'vitals' | 'medication' | 'turning' | 'wound_care' | 'education' | 'observation' | 'other';
export type NursingTaskStatus = 'pending' | 'executing' | 'done' | 'cancelled';

/* ------------------------------ 护理记录单 ------------------------------ */

export interface NursingRecord {
  id: string;
  visitId: string;
  patientId: string;
  recordNo: string;
  recordedAt: string;
  shift: NursingShift;
  nursingLevel: NursingLevel;
  vitals: Record<string, unknown>;
  intake: Record<string, unknown>;
  output: Record<string, unknown>;
  measures: string | null;
  pressureSoreRisk: RiskLevel;
  fallRisk: RiskLevel;
  riskAssessment: Record<string, unknown>;
  aiAssisted: boolean;
  status: 'draft' | 'signed';
  nurseId: string | null;
  signedBy: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NursingRecordInput {
  visitId: string;
  patientId: string;
  recordedAt?: string | null;
  shift?: NursingShift;
  nursingLevel: NursingLevel;
  vitals?: Record<string, unknown>;
  intake?: Record<string, unknown>;
  output?: Record<string, unknown>;
  measures?: string | null;
  pressureSoreRisk?: RiskLevel;
  fallRisk?: RiskLevel;
  riskAssessment?: Record<string, unknown>;
  aiAssisted?: boolean;
  nurseId: string;
}

const RECORD_COLS = `id, visit_id, patient_id, record_no, recorded_at, shift, nursing_level,
  vitals, intake, output, measures, pressure_sore_risk, fall_risk, risk_assessment,
  ai_assisted, status, nurse_id, signed_by, signed_at, created_at, updated_at`;

function mapRecord(row: Record<string, unknown>): NursingRecord {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    recordNo: String(row.record_no),
    recordedAt: String(row.recorded_at),
    shift: row.shift as NursingShift,
    nursingLevel: row.nursing_level as NursingLevel,
    vitals: (row.vitals as Record<string, unknown>) ?? {},
    intake: (row.intake as Record<string, unknown>) ?? {},
    output: (row.output as Record<string, unknown>) ?? {},
    measures: row.measures ? String(row.measures) : null,
    pressureSoreRisk: row.pressure_sore_risk as RiskLevel,
    fallRisk: row.fall_risk as RiskLevel,
    riskAssessment: (row.risk_assessment as Record<string, unknown>) ?? {},
    aiAssisted: Boolean(row.ai_assisted),
    status: row.status as 'draft' | 'signed',
    nurseId: row.nurse_id ? String(row.nurse_id) : null,
    signedBy: row.signed_by ? String(row.signed_by) : null,
    signedAt: row.signed_at ? String(row.signed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function generateRecordNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const hms = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
  return `NR${ymd}${hms}${Math.floor(Math.random() * 900) + 100}`;
}

/** 创建护理记录草稿（status=draft）。 */
export async function createNursingRecord(
  input: NursingRecordInput, db?: DbExecutor,
): Promise<NursingRecord> {
  const exec = db ?? getDb();
  const rows = await exec`
    INSERT INTO clinical.nursing_records (
      visit_id, patient_id, record_no, recorded_at, shift, nursing_level, vitals, intake,
      output, measures, pressure_sore_risk, fall_risk, risk_assessment, ai_assisted,
      status, nurse_id
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${generateRecordNo()},
      ${input.recordedAt ?? new Date().toISOString()}, ${input.shift ?? 'day'},
      ${input.nursingLevel}, ${exec.json(toJson(input.vitals ?? {}))},
      ${exec.json(toJson(input.intake ?? {}))}, ${exec.json(toJson(input.output ?? {}))},
      ${input.measures ?? null}, ${input.pressureSoreRisk ?? 'none'},
      ${input.fallRisk ?? 'none'}, ${exec.json(toJson(input.riskAssessment ?? {}))},
      ${input.aiAssisted ?? false}, 'draft', ${input.nurseId}
    )
    RETURNING ${exec.unsafe(RECORD_COLS)}
  `;
  return mapRecord(rows[0] as Record<string, unknown>);
}

export async function getNursingRecordById(id: string, db?: DbExecutor): Promise<NursingRecord | null> {
  const exec = db ?? getDb();
  const rows = await exec`SELECT ${exec.unsafe(RECORD_COLS)} FROM clinical.nursing_records WHERE id = ${id}`;
  return rows.length > 0 ? mapRecord(rows[0] as Record<string, unknown>) : null;
}

/** 某就诊护理记录（时间倒序）。 */
export async function listNursingRecordsByVisit(
  visitId: string, db?: DbExecutor,
): Promise<NursingRecord[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(RECORD_COLS)} FROM clinical.nursing_records
    WHERE visit_id = ${visitId} AND deleted_at IS NULL
    ORDER BY recorded_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRecord);
}

/**
 * 本人签名：draft → signed。
 * CAS 限定 status='draft' 且 signed_by 为责任护士本人（防代签）。
 */
export async function signNursingRecord(
  id: string, signerId: string, db?: DbExecutor,
): Promise<NursingRecord | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.nursing_records
    SET status = 'signed', signed_by = ${signerId}, signed_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'draft' AND nurse_id = ${signerId}
    RETURNING ${exec.unsafe(RECORD_COLS)}
  `;
  return rows.length > 0 ? mapRecord(rows[0] as Record<string, unknown>) : null;
}

/* -------------------------------- 护理任务 ------------------------------- */

export interface NursingTask {
  id: string;
  visitId: string;
  patientId: string;
  taskNo: string;
  taskType: NursingTaskType;
  content: string;
  scheduledAt: string;
  status: NursingTaskStatus;
  idempotencyKey: string;
  result: string | null;
  executedBy: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NursingTaskInput {
  visitId: string;
  patientId: string;
  taskType?: NursingTaskType;
  content: string;
  scheduledAt?: string | null;
  idempotencyKey: string;
}

const TASK_COLS = `id, visit_id, patient_id, task_no, task_type, content, scheduled_at,
  status, idempotency_key, result, executed_by, executed_at, created_at, updated_at`;

function mapTask(row: Record<string,unknown>): NursingTask {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    taskNo: String(row.task_no),
    taskType: row.task_type as NursingTaskType,
    content: String(row.content),
    scheduledAt: String(row.scheduled_at),
    status: row.status as NursingTaskStatus,
    idempotencyKey: String(row.idempotency_key),
    result: row.result ? String(row.result) : null,
    executedBy: row.executed_by ? String(row.executed_by) : null,
    executedAt: row.executed_at ? String(row.executed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function generateTaskNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `NT${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

/** 唯一约束冲突判定（postgres.js 错误码 23505）。 */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

/** 创建护理任务（pending）。重复 idempotency_key → 唯一冲突。 */
export async function createNursingTask(input: NursingTaskInput, db?: DbExecutor): Promise<NursingTask> {
  const exec = db ?? getDb();
  const rows = await exec`
    INSERT INTO clinical.nursing_tasks (
      visit_id, patient_id, task_no, task_type, content, scheduled_at,
      status, idempotency_key
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${generateTaskNo()},
      ${input.taskType ?? 'other'}, ${input.content},
      ${input.scheduledAt ?? new Date().toISOString()}, 'pending', ${input.idempotencyKey}
    )
    RETURNING ${exec.unsafe(TASK_COLS)}
  `;
  return mapTask(rows[0] as Record<string, unknown>);
}

export async function getNursingTaskById(id: string, db?: DbExecutor): Promise<NursingTask | null> {
  const exec = db ?? getDb();
  const rows = await exec`SELECT ${exec.unsafe(TASK_COLS)} FROM clinical.nursing_tasks WHERE id = ${id}`;
  return rows.length > 0 ? mapTask(rows[0] as Record<string, unknown>) : null;
}

export async function getNursingTaskByIdem(
  idempotencyKey: string, db?: DbExecutor,
): Promise<NursingTask | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(TASK_COLS)} FROM clinical.nursing_tasks WHERE idempotency_key = ${idempotencyKey}
  `;
  return rows.length > 0 ? mapTask(rows[0] as Record<string, unknown>) : null;
}

/** 某就诊护理任务（按计划时间）。 */
export async function listNursingTasksByVisit(
  visitId: string, db?: DbExecutor,
): Promise<NursingTask[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(TASK_COLS)} FROM clinical.nursing_tasks
    WHERE visit_id = ${visitId} ORDER BY scheduled_at ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapTask);
}

/**
 * 执行护理任务：pending → done（CAS）。
 * 并发下仅一个 UPDATE 命中 status='pending'，其余返回 null → 聚合器据此判定重复执行。
 */
export async function executeNursingTask(
  id: string, nurseId: string, result?: string | null, db?: DbExecutor,
): Promise<NursingTask | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.nursing_tasks
    SET status = 'done', result = ${result ?? null}, executed_by = ${nurseId},
        executed_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending'
    RETURNING ${exec.unsafe(TASK_COLS)}
  `;
  return rows.length > 0 ? mapTask(rows[0] as Record<string, unknown>) : null;
}

/** 取消护理任务：pending → cancelled。 */
export async function cancelNursingTask(id: string, db?: DbExecutor): Promise<NursingTask | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.nursing_tasks
    SET status = 'cancelled', updated_at = now()
    WHERE id = ${id} AND status = 'pending'
    RETURNING ${exec.unsafe(TASK_COLS)}
  `;
  return rows.length > 0 ? mapTask(rows[0] as Record<string, unknown>) : null;
}
