/**
 * 健澜科技数智医院智能体 - 就诊 Repository
 * clinical.visits 表 CRUD（门诊/急诊/住院/体检）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../pool.js';
import { dynamicSelect, QueryBuilder } from './helpers.js';

export type VisitType = 'outpatient' | 'emergency' | 'inpatient' | 'checkup';
export type VisitStatus = 'ongoing' | 'discharged' | 'transferred' | 'cancelled';

export interface Visit {
  id: string; patientId: string; visitNo: string; visitType: VisitType;
  department: string; ward: string | null; bedNo: string | null;
  attendingDoctorId: string | null; chiefComplaint: string | null;
  consultationDetail: Record<string, unknown> | null;
  status: VisitStatus; triageLevel: string | null; admitAt: string | null;
  dischargeAt: string | null; drgGroup: string | null; dipGroup: string | null;
  totalFee: number | null; createdAt: string; updatedAt: string;
}

export interface VisitCreateInput {
  patientId: string; visitType: VisitType; department: string;
  ward?: string | null; bedNo?: string | null; attendingDoctorId?: string | null;
  chiefComplaint?: string | null; triageLevel?: string | null;
}

const SELECT_COLS = `id, patient_id, visit_no, visit_type, department, ward, bed_no, attending_doctor_id, chief_complaint, consultation_detail, status, triage_level, admit_at, discharge_at, drg_group, dip_group, total_fee, created_at, updated_at`;

/** 规范化问诊明细：历史数据可能被双重编码为字符串，此处解析回对象 */
function normalizeConsultationDetail(v: unknown): Record<string, unknown> | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function mapRow(row: Record<string, unknown>): Visit {
  return {
    id: String(row.id), patientId: String(row.patient_id), visitNo: String(row.visit_no),
    visitType: row.visit_type as VisitType, department: String(row.department),
    ward: row.ward ? String(row.ward) : null, bedNo: row.bed_no ? String(row.bed_no) : null,
    attendingDoctorId: row.attending_doctor_id ? String(row.attending_doctor_id) : null,
    chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : null,
    consultationDetail: normalizeConsultationDetail(row.consultation_detail),
    status: row.status as VisitStatus, triageLevel: row.triage_level ? String(row.triage_level) : null,
    admitAt: row.admit_at ? String(row.admit_at) : null,
    dischargeAt: row.discharge_at ? String(row.discharge_at) : null,
    drgGroup: row.drg_group ? String(row.drg_group) : null,
    dipGroup: row.dip_group ? String(row.dip_group) : null,
    totalFee: row.total_fee !== null ? Number(row.total_fee) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function generateVisitNo(type: VisitType): string {
  const prefix = { outpatient: 'OP', emergency: 'ER', inpatient: 'IP', checkup: 'CP' }[type];
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

export async function createVisit(input: VisitCreateInput, sql?: Sql): Promise<Visit> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.visits (patient_id, visit_no, visit_type, department, ward, bed_no, attending_doctor_id, chief_complaint, triage_level, admit_at)
    VALUES (${input.patientId}, ${generateVisitNo(input.visitType)}, ${input.visitType}, ${input.department},
      ${input.ward ?? null}, ${input.bedNo ?? null}, ${input.attendingDoctorId ?? null},
      ${input.chiefComplaint ?? null}, ${input.triageLevel ?? null}, ${new Date().toISOString()})
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getVisitById(id: string, sql?: Sql): Promise<Visit | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.visits WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getVisitsByPatient(
  patientId: string, options?: { status?: VisitStatus; limit?: number }, sql?: Sql,
): Promise<Visit[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('patient_id = ?', patientId);
  if (options?.status) qb.where('status = ?', options.status);
  const rows = await dynamicSelect<Record<string, unknown>>(db, SELECT_COLS, 'clinical.visits', qb, 'admit_at DESC', options?.limit ?? 50);
  return rows.map(mapRow);
}

export async function updateVisitStatus(id: string, status: VisitStatus, sql?: Sql): Promise<Visit | null> {
  const db = sql ?? getDb();
  const dischargeAt = status === 'discharged' ? new Date().toISOString() : null;
  const rows = await db`
    UPDATE clinical.visits SET status = ${status}, discharge_at = COALESCE(discharge_at, ${dischargeAt ?? null}), updated_at = now()
    WHERE id = ${id} RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 更新主诉与结构化问诊明细 */
export async function updateVisitConsultation(
  id: string,
  input: { chiefComplaint?: string | null; detail?: Record<string, unknown> },
  sql?: Sql,
): Promise<Visit | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.visits
    SET chief_complaint = COALESCE(${input.chiefComplaint ?? null}, chief_complaint),
        consultation_detail = COALESCE(${input.detail ? db.json(input.detail as unknown as Parameters<Sql['json']>[0]) : null}, consultation_detail),
        updated_at = now()
    WHERE id = ${id} RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}
