/**
 * 健澜科技 jlmedaios - 抢救记录 Repository（M1-B1）
 *
 * clinical.resuscitations 表访问：
 *  - startResuscitation 启动抢救：取抢救号、记录开始时间、抢救床、团队；
 *  - appendEvent 追加抢救时间轴事件（只追加，不可篡改）；
 *  - appendMedication 追加抢救用药；appendVitalPoint 追加生命体征趋势点；
 *  - completeResuscitation 结束抢救：写转归与小结。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ============================== 类型 ============================== */

export type ResusStatus = 'resuscitating' | 'stabilized' | 'transferred_icu' | 'deceased';

export interface ResusEvent {
  time: string;
  type: string;
  content: string;
  operator?: string;
}

export interface ResusMedication {
  name: string;
  dose: string;
  route?: string;
  time: string;
}

export interface VitalPoint {
  time: string;
  pulse?: number;
  systolic?: number;
  spo2?: number;
  respiration?: number;
}

export interface Resuscitation {
  id: string;
  resusNo: string;
  visitId: string;
  patientId: string;
  bedNo: string | null;
  bedId: string | null;
  startTime: string;
  endTime: string | null;
  diagnosis: string | null;
  leadDoctorId: string | null;
  leadNurseId: string | null;
  status: ResusStatus;
  events: ResusEvent[];
  vitalTrend: VitalPoint[];
  medications: ResusMedication[];
  team: Array<Record<string, unknown>>;
  outcome: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartResusInput {
  visitId: string;
  patientId: string;
  bedNo?: string | null;
  bedId?: string | null;
  diagnosis?: string | null;
  leadDoctorId?: string | null;
  leadNurseId?: string | null;
  startTime?: string;
  team?: Array<Record<string, unknown>>;
}

/* ============================= 映射 ============================== */

function mapRow(row: Record<string, unknown>): Resuscitation {
  return {
    id: String(row.id),
    resusNo: String(row.resus_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    bedNo: row.bed_no ? String(row.bed_no) : null,
    bedId: row.bed_id ? String(row.bed_id) : null,
    startTime: String(row.start_time),
    endTime: row.end_time ? String(row.end_time) : null,
    diagnosis: row.diagnosis ? String(row.diagnosis) : null,
    leadDoctorId: row.lead_doctor_id ? String(row.lead_doctor_id) : null,
    leadNurseId: row.lead_nurse_id ? String(row.lead_nurse_id) : null,
    status: String(row.status) as ResusStatus,
    events: (row.events as ResusEvent[]) ?? [],
    vitalTrend: (row.vital_trend as VitalPoint[]) ?? [],
    medications: (row.medications as ResusMedication[]) ?? [],
    team: (row.team as Array<Record<string, unknown>>) ?? [],
    outcome: row.outcome ? String(row.outcome) : null,
    summary: row.summary ? String(row.summary) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ============================ 启动 ============================== */

export async function startResuscitation(input: StartResusInput, executor?: DbExecutor): Promise<Resuscitation> {
  return withExecutor(executor, async (sql) => {
    const dup = await sql`
      SELECT id FROM clinical.resuscitations
      WHERE visit_id = ${input.visitId} AND status = 'resuscitating'
    `;
    if (dup.length) throw new ResusConflictError('该患者已有进行中的抢救记录');

    const seqRows = await sql`SELECT nextval('clinical.emergency_triage_no_seq')::bigint AS seq`;
    const resusNo = `RS${String(seqRows[0].seq)}`;
    const start = input.startTime ?? new Date().toISOString();

    const rows = await sql`
      INSERT INTO clinical.resuscitations (
        resus_no, visit_id, patient_id, bed_no, bed_id,
        start_time, diagnosis, lead_doctor_id, lead_nurse_id, team, status
      ) VALUES (
        ${resusNo}, ${input.visitId}, ${input.patientId},
        ${input.bedNo ?? null}, ${input.bedId ?? null},
        ${start}, ${input.diagnosis ?? null},
        ${input.leadDoctorId ?? null}, ${input.leadNurseId ?? null},
        ${(input.team ?? []) as never}, 'resuscitating'
      )
      RETURNING *
    `;
    return mapRow(rows[0]);
  });
}

/* ============================ 追加 ============================== */

/** 追加抢救事件（只追加） */
export async function appendEvent(
  resusId: string,
  event: ResusEvent,
  executor?: DbExecutor,
): Promise<Resuscitation> {
  return mutateArray(resusId, 'events', event, executor);
}

/** 追加抢救用药 */
export async function appendMedication(
  resusId: string,
  med: ResusMedication,
  executor?: DbExecutor,
): Promise<Resuscitation> {
  return mutateArray(resusId, 'medications', med, executor);
}

/** 追加生命体征趋势点 */
export async function appendVitalPoint(
  resusId: string,
  point: VitalPoint,
  executor?: DbExecutor,
): Promise<Resuscitation> {
  return mutateArray(resusId, 'vital_trend', point, executor);
}

async function mutateArray(
  resusId: string,
  column: 'events' | 'medications' | 'vital_trend',
  item: unknown,
  executor?: DbExecutor,
): Promise<Resuscitation> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`
      UPDATE clinical.resuscitations
      SET ${sql.unsafe(column)} = ${sql.unsafe(column)} || ${[item] as never}
      WHERE id = ${resusId} AND status = 'resuscitating'
      RETURNING *
    `;
    if (!rows.length) throw new ResusConflictError('抢救记录不存在或已结束，不能追加');
    return mapRow(rows[0]);
  });
}

/* ============================ 结束 ============================== */

export async function completeResuscitation(
  resusId: string,
  data: { status: Exclude<ResusStatus, 'resuscitating'>; outcome: string; summary?: string | null; endTime?: string },
  executor?: DbExecutor,
): Promise<Resuscitation> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`
      UPDATE clinical.resuscitations SET
        status = ${data.status},
        end_time = ${data.endTime ?? new Date().toISOString()},
        outcome = ${data.outcome},
        summary = ${data.summary ?? null}
      WHERE id = ${resusId} AND status = 'resuscitating'
      RETURNING *
    `;
    if (!rows.length) throw new ResusConflictError('抢救记录不存在或已结束');
    return mapRow(rows[0]);
  });
}

/* ============================ 查询 ============================== */

export async function getResuscitationById(id: string, executor?: DbExecutor): Promise<Resuscitation | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`SELECT * FROM clinical.resuscitations WHERE id = ${id}`;
    return rows.length ? mapRow(rows[0]) : null;
  });
}

export async function getActiveResusByVisit(visitId: string, executor?: DbExecutor): Promise<Resuscitation | null> {
  return withExecutor(executor, async (sql) => {
    const rows = await sql`
      SELECT * FROM clinical.resuscitations
      WHERE visit_id = ${visitId} AND status = 'resuscitating'
      ORDER BY start_time DESC LIMIT 1
    `;
    return rows.length ? mapRow(rows[0]) : null;
  });
}

export async function listResuscitations(
  filter: { status?: ResusStatus; activeOnly?: boolean } = {},
  executor?: DbExecutor,
): Promise<Resuscitation[]> {
  return withExecutor(executor, async (sql) => {
    let rows: Record<string, unknown>[];
    if (filter.activeOnly) {
      rows = await sql`SELECT * FROM clinical.resuscitations WHERE status = 'resuscitating' ORDER BY start_time`;
    } else if (filter.status) {
      rows = await sql`SELECT * FROM clinical.resuscitations WHERE status = ${filter.status} ORDER BY start_time`;
    } else {
      rows = await sql`SELECT * FROM clinical.resuscitations ORDER BY start_time`;
    }
    return rows.map(mapRow);
  });
}

/* =========================== 错误 ============================== */

export class ResusConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResusConflictError';
  }
}

async function withExecutor<T>(executor: DbExecutor | undefined, fn: (sql: DbExecutor) => Promise<T>): Promise<T> {
  return executor ? fn(executor) : fn(getDb());
}
