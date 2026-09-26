/**
 * 健澜科技 jlmedaios - 急诊分诊 Repository（M1-B1）
 *
 * clinical.emergency_triage / clinical.emergency_dispositions 表访问：
 *  - createArrival 接诊：建/取患者 → 建急诊就诊 → 取序列生成 triage_no/visit_no
 *    → 建分诊记录（waiting_triage），全流程单事务，并发不重号、不串单；
 *  - completeTriage 完成分诊分级：写入 NEWS/GCS/卒中量表、规则/AI 建议、
 *    护士确认级别，状态 waiting_triage → triaged；
 *  - updateEmStatus 工作流状态流转；green channel 叠加标志；
 *  - createDisposition 终末转归。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { getDb, type DbExecutor, type Sql } from '../pool.js';
import * as patientRepo from './patientRepo.js';
import type { EmergencyStatus } from '@/emergency/stateMachine.js';

/* ============================== 类型 ============================== */

export interface EmergencyTriage {
  id: string;
  triageNo: string;
  visitId: string;
  patientId: string;
  triageNurseId: string | null;
  arriveTime: string;
  triageTime: string | null;
  chiefComplaint: string | null;
  vitals: Record<string, unknown>;
  gcsEye: number | null;
  gcsVerbal: number | null;
  gcsMotor: number | null;
  gcsTotal: number | null;
  newsScore: number | null;
  strokeScale: Record<string, unknown>;
  level: number | null;
  ruleSuggestedLevel: number | null;
  aiSuggestedLevel: number | null;
  aiAdvice: Record<string, unknown>;
  vitalScore: number | null;
  complaintScore: number | null;
  totalScore: number | null;
  basis: string | null;
  confirmed: boolean;
  greenChannelActive: boolean;
  emStatus: EmergencyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewPatientInput {
  nameMasked: string;
  gender?: '男' | '女' | '未知' | '未说明';
  birthDate?: string | null;
  mrn?: string;
  bloodType?: string | null;
  allergies?: Array<Record<string, unknown>>;
  tags?: string[];
}

export interface ArrivalInput {
  patientId?: string;
  newPatient?: NewPatientInput;
  chiefComplaint?: string;
  arriveTime?: string;
  campusId?: string;
}

export interface ArrivalResult {
  triage: EmergencyTriage;
  visitId: string;
  patientId: string;
}

/** 完成分诊分级入参（评分结果由聚合器计算后落库） */
export interface CompleteTriageInput {
  vitals: Record<string, unknown>;
  gcsEye?: number | null;
  gcsVerbal?: number | null;
  gcsMotor?: number | null;
  gcsTotal?: number | null;
  newsScore?: number | null;
  strokeScale?: Record<string, unknown>;
  level: number;
  ruleSuggestedLevel?: number | null;
  aiSuggestedLevel?: number | null;
  aiAdvice?: Record<string, unknown>;
  vitalScore?: number | null;
  complaintScore?: number | null;
  totalScore?: number | null;
  basis: string;
  triageTime?: string;
}

export type DispositionCode =
  | 'admitted'
  | 'surgery'
  | 'observation'
  | 'discharged'
  | 'transferred'
  | 'deceased';

export interface Disposition {
  id: string;
  visitId: string;
  patientId: string;
  disposition: DispositionCode;
  destination: string | null;
  wardId: string | null;
  bedId: string | null;
  remark: string | null;
  operatorId: string | null;
  dispositionTime: string;
  createdAt: string;
}

/* ============================= 映射 ============================== */

function mapTriage(row: Record<string, unknown>): EmergencyTriage {
  const n = (v: unknown): number | null => (v == null ? null : Number(v));
  return {
    id: String(row.id),
    triageNo: String(row.triage_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    triageNurseId: row.triage_nurse_id ? String(row.triage_nurse_id) : null,
    arriveTime: String(row.arrive_time),
    triageTime: row.triage_time ? String(row.triage_time) : null,
    chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : null,
    vitals: (row.vitals as Record<string, unknown>) ?? {},
    gcsEye: n(row.gcs_eye),
    gcsVerbal: n(row.gcs_verbal),
    gcsMotor: n(row.gcs_motor),
    gcsTotal: n(row.gcs_total),
    newsScore: n(row.news_score),
    strokeScale: (row.stroke_scale as Record<string, unknown>) ?? {},
    level: n(row.level),
    ruleSuggestedLevel: n(row.rule_suggested_level),
    aiSuggestedLevel: n(row.ai_suggested_level),
    aiAdvice: (row.ai_advice as Record<string, unknown>) ?? {},
    vitalScore: n(row.vital_score),
    complaintScore: n(row.complaint_score),
    totalScore: n(row.total_score),
    basis: row.basis ? String(row.basis) : null,
    confirmed: Boolean(row.confirmed),
    greenChannelActive: Boolean(row.green_channel_active),
    emStatus: String(row.em_status) as EmergencyStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDisposition(row: Record<string, unknown>): Disposition {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    disposition: String(row.disposition) as DispositionCode,
    destination: row.destination ? String(row.destination) : null,
    wardId: row.ward_id ? String(row.ward_id) : null,
    bedId: row.bed_id ? String(row.bed_id) : null,
    remark: row.remark ? String(row.remark) : null,
    operatorId: row.operator_id ? String(row.operator_id) : null,
    dispositionTime: String(row.disposition_time),
    createdAt: String(row.created_at),
  };
}

/* ============================ 接诊 ============================== */

/**
 * 接诊：创建急诊就诊与分诊记录。
 * 单事务内取一次序列，同值派生 visit_no(ER) 与 triage_no(FN)。
 */
export async function createArrival(input: ArrivalInput, executor?: DbExecutor): Promise<ArrivalResult> {
  return withExecutor(executor, async (sql) => {
    // 1. 先取序列（同事务，并发安全）：visit_no(ER) 与 triage_no(FN) 同值派生，
    //    新患者 mrn 也由该唯一序号派生，避免时间戳占位号在高并发下撞 mrn 唯一键
    const seqRows = await sql`SELECT nextval('clinical.emergency_triage_no_seq')::bigint AS seq`;
    const seq = String(seqRows[0].seq);
    const visitNo = `ER${seq}`;
    const triageNo = `FN${seq}`;
    const newMrn = `EPAT${seq}`;
    const arrive = input.arriveTime ?? new Date().toISOString();

    // 2. 患者：已存在直接取；否则以确定 mrn 建档
    let patientId = input.patientId;
    if (!patientId) {
      const np = input.newPatient;
      if (!np?.nameMasked) throw new ArrivalValidationError('接诊需提供 patientId 或新患者姓名');
      const patient = await patientRepo.createPatient(
        {
          mrn: np.mrn ?? newMrn,
          nameMasked: np.nameMasked,
          gender: np.gender ?? '未知',
          birthDate: np.birthDate ?? null,
          bloodType: np.bloodType ?? null,
          allergies: np.allergies ?? [],
          tags: Array.from(new Set([...(np.tags ?? []), '急诊'])),
        },
        sql,
      );
      patientId = patient.id;
    }


    // 3. 建急诊就诊（接诊时无经治医生，attending_doctor_id 留空；状态 waiting 候诊）
    const visitRows = await sql`
      INSERT INTO clinical.visits (
        visit_no, patient_id, visit_type, department, attending_doctor_id,
        status, admit_at, campus_id
      ) VALUES (
        ${visitNo}, ${patientId}, 'emergency', '急诊科', NULL,
        'waiting', ${arrive}, ${input.campusId ?? null}
      )
      RETURNING id, patient_id
    `;
    const visitId = String(visitRows[0].id);

    // 4. 建分诊记录（待分诊）
    const rows = await sql`
      INSERT INTO clinical.emergency_triage (
        triage_no, visit_id, patient_id, arrive_time,
        chief_complaint, em_status
      ) VALUES (
        ${triageNo}, ${visitId}, ${patientId}, ${arrive},
        ${input.chiefComplaint ?? null}, 'waiting_triage'
      )
      RETURNING *
    `;
    return { triage: mapTriage(rows[0]), visitId, patientId };
  });
}

/* ============================ 查询 ============================== */

export async function getTriageByVisit(visitId: string, executor?: DbExecutor): Promise<EmergencyTriage | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`SELECT * FROM clinical.emergency_triage WHERE visit_id = ${visitId}`;
    return rows.length ? mapTriage(rows[0]) : null;
  });
}

export async function getTriageById(id: string, executor?: DbExecutor): Promise<EmergencyTriage | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`SELECT * FROM clinical.emergency_triage WHERE id = ${id}`;
    return rows.length ? mapTriage(rows[0]) : null;
  });
}

export interface TriageQuery {
  /** 仅返回非终态（在急诊区内） */
  activeOnly?: boolean;
  statuses?: EmergencyStatus[];
  levels?: number[];
  /** 仅待分诊 */
  waitingOnly?: boolean;
  limit?: number;
}

/** 列出分诊记录（默认按到达时间倒序） */
export async function listTriage(query: TriageQuery = {}, executor?: DbExecutor): Promise<EmergencyTriage[]> {
  return withExecutor(executor, async (sql) => {
    const conds: string[] = [];
    if (query.activeOnly) {
      conds.push(`em_status IN ('waiting_triage','triaged','in_treatment','resuscitation','observation')`);
    }
    if (query.waitingOnly) conds.push(`em_status = 'waiting_triage'`);
    if (query.statuses?.length) conds.push(`em_status IN (${query.statuses.map((s) => `'${s}'`).join(',')})`);
    if (query.levels?.length) conds.push(`level IN (${query.levels.join(',')})`);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const limit = query.limit ? `LIMIT ${Math.min(query.limit, 500)}` : '';
    const rows = await sql`
      SELECT * FROM clinical.emergency_triage
      ${sql.unsafe(where)}
      ORDER BY arrive_time ASC
      ${sql.unsafe(limit)}
    `;
    return rows.map(mapTriage);
  });
}

/* ========================= 分诊分级 ============================= */

/** 完成分诊分级：写入客观评分与护士确认级别，状态 → triaged */
export async function completeTriage(
  visitId: string,
  input: CompleteTriageInput,
  nurseId: string,
  executor?: DbExecutor,
): Promise<EmergencyTriage> {
  return withExecutor(executor, async (sql) => {
    const existing = await getTriageByVisit(visitId, sql);
    if (!existing) throw new TriageNotFoundError(visitId);
    if (existing.confirmed) throw new TriageConflictError('该患者已完成分诊分级，不能重复分级');
    if (!input.level || input.level < 1 || input.level > 4) {
      throw new ArrivalValidationError('分诊级别必须为 1–4');
    }
    const triageTime = input.triageTime ?? new Date().toISOString();
    const rows = await sql`
      UPDATE clinical.emergency_triage SET
        triage_nurse_id = ${nurseId},
        triage_time = ${triageTime},
        vitals = ${input.vitals as never},
        gcs_eye = ${input.gcsEye ?? null},
        gcs_verbal = ${input.gcsVerbal ?? null},
        gcs_motor = ${input.gcsMotor ?? null},
        gcs_total = ${input.gcsTotal ?? null},
        news_score = ${input.newsScore ?? null},
        stroke_scale = ${(input.strokeScale ?? {}) as never},
        level = ${input.level},
        rule_suggested_level = ${input.ruleSuggestedLevel ?? null},
        ai_suggested_level = ${input.aiSuggestedLevel ?? null},
        ai_advice = ${(input.aiAdvice ?? {}) as never},
        vital_score = ${input.vitalScore ?? null},
        complaint_score = ${input.complaintScore ?? null},
        total_score = ${input.totalScore ?? null},
        basis = ${input.basis},
        confirmed = true,
        em_status = 'triaged'
      WHERE visit_id = ${visitId}
      RETURNING *
    `;
    return mapTriage(rows[0]);
  });
}

/* ========================= 状态流转 ============================= */

/** 更新主状态（合法性由聚合器状态机断言） */
export async function updateEmStatus(
  visitId: string,
  status: EmergencyStatus,
  executor?: DbExecutor,
): Promise<EmergencyTriage> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`
      UPDATE clinical.emergency_triage SET em_status = ${status}
      WHERE visit_id = ${visitId}
      RETURNING *
    `;
    if (!rows.length) throw new TriageNotFoundError(visitId);
    return mapTriage(rows[0]);
  });
}

/** 设置绿色通道叠加标志 */
export async function setGreenChannelFlag(
  visitId: string,
  active: boolean,
  executor?: DbExecutor,
): Promise<void> {
  return withExecutor(executor, async (sql) => {
    await sql`UPDATE clinical.emergency_triage SET green_channel_active = ${active} WHERE visit_id = ${visitId}`;
  });
}

/* =========================== 转归 ============================== */

/** 创建终末转归（一次急诊就诊一条） */
export async function createDisposition(
  visitId: string,
  data: {
    disposition: DispositionCode;
    destination?: string | null;
    wardId?: string | null;
    bedId?: string | null;
    remark?: string | null;
    dispositionTime?: string;
  },
  operatorId: string,
  executor?: DbExecutor,
): Promise<Disposition> {
  return withExecutor(executor, async (sql) => {
    const triage = await getTriageByVisit(visitId, sql);
    if (!triage) throw new TriageNotFoundError(visitId);
    const existing = await getDispositionByVisit(visitId, sql);
    if (existing) throw new TriageConflictError('该患者已记录转归，不能重复记录');

    const rows = await sql`
      INSERT INTO clinical.emergency_dispositions (
        visit_id, patient_id, disposition, destination, ward_id, bed_id,
        remark, operator_id, disposition_time
      ) VALUES (
        ${visitId}, ${triage.patientId}, ${data.disposition},
        ${data.destination ?? null}, ${data.wardId ?? null}, ${data.bedId ?? null},
        ${data.remark ?? null}, ${operatorId},
        ${data.dispositionTime ?? new Date().toISOString()}
      )
      RETURNING *
    `;
    return mapDisposition(rows[0]);
  });
}

export async function getDispositionByVisit(visitId: string, executor?: DbExecutor): Promise<Disposition | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`SELECT * FROM clinical.emergency_dispositions WHERE visit_id = ${visitId}`;
    return rows.length ? mapDisposition(rows[0]) : null;
  });
}

/* =========================== 错误 ============================== */

export class ArrivalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArrivalValidationError';
  }
}

export class TriageNotFoundError extends Error {
  constructor(visitId: string) {
    super(`急诊分诊记录不存在: ${visitId}`);
    this.name = 'TriageNotFoundError';
  }
}

export class TriageConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TriageConflictError';
  }
}

/* =========================== 辅助 ============================== */

async function withExecutor<T>(
  executor: DbExecutor | undefined,
  fn: (sql: DbExecutor) => Promise<T>,
): Promise<T> {
  return executor ? fn(executor) : fn(getDb());
}
