/**
 * 健澜科技 jlmedaios - 入院记录 / ADT 事件 Repository
 *
 * clinical.admissions（入院记录）与 clinical.adt_events（入院/换床/转科/出院移动史）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ----------------------------- 入院记录 ------------------------------ */

export type AdmissionType = 'elective' | 'emergency' | 'transfer';
export type AdmissionSource = 'outpatient' | 'emergency' | 'transfer' | 'other';
export type AdmissionStatus = 'admitted' | 'transferred' | 'discharged';
export type ConditionLevel = 'critical' | 'serious' | 'stable';

export interface Admission {
  id: string;
  admissionNo: string;
  visitId: string;
  patientId: string;
  wardId: string | null;
  bedId: string | null;
  department: string;
  admittingDoctorId: string | null;
  admissionType: AdmissionType;
  source: AdmissionSource;
  diagnosis: string | null;
  conditionOnAdmission: ConditionLevel;
  admittedAt: string;
  dischargedAt: string | null;
  status: AdmissionStatus;
  createdAt: string;
  updatedAt: string;
}

const ADMISSION_COLS = `
  id, admission_no, visit_id, patient_id, ward_id, bed_id, department, admitting_doctor_id,
  admission_type, source, diagnosis, condition_on_admission, admitted_at, discharged_at,
  status, created_at, updated_at
`;

function mapAdmission(row: Record<string, unknown>): Admission {
  return {
    id: String(row.id),
    admissionNo: String(row.admission_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    wardId: row.ward_id ? String(row.ward_id) : null,
    bedId: row.bed_id ? String(row.bed_id) : null,
    department: String(row.department),
    admittingDoctorId: row.admitting_doctor_id ? String(row.admitting_doctor_id) : null,
    admissionType: row.admission_type as AdmissionType,
    source: row.source as AdmissionSource,
    diagnosis: row.diagnosis ? String(row.diagnosis) : null,
    conditionOnAdmission: row.condition_on_admission as ConditionLevel,
    admittedAt: String(row.admitted_at),
    dischargedAt: row.discharged_at ? String(row.discharged_at) : null,
    status: row.status as AdmissionStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface AdmissionCreateInput {
  admissionNo: string;
  visitId: string;
  patientId: string;
  wardId: string;
  bedId: string;
  department: string;
  admittingDoctorId: string;
  admissionType: AdmissionType;
  source: AdmissionSource;
  diagnosis: string;
  conditionOnAdmission: ConditionLevel;
  admittedAt?: string;
}

export async function createAdmission(input: AdmissionCreateInput, tx: DbExecutor): Promise<Admission> {
  const rows = await tx`
    INSERT INTO clinical.admissions (
      admission_no, visit_id, patient_id, ward_id, bed_id, department, admitting_doctor_id,
      admission_type, source, diagnosis, condition_on_admission, admitted_at, status
    ) VALUES (
      ${input.admissionNo}, ${input.visitId}, ${input.patientId}, ${input.wardId}, ${input.bedId},
      ${input.department}, ${input.admittingDoctorId}, ${input.admissionType}, ${input.source},
      ${input.diagnosis}, ${input.conditionOnAdmission},
      ${input.admittedAt ?? new Date().toISOString()}, 'admitted'
    )
    RETURNING ${tx.unsafe(ADMISSION_COLS)}
  `;
  return mapAdmission(rows[0] as Record<string, unknown>);
}

export async function getAdmissionByVisit(visitId: string, sql?: DbExecutor): Promise<Admission | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ADMISSION_COLS)} FROM clinical.admissions WHERE visit_id = ${visitId}
  `;
  return rows.length > 0 ? mapAdmission(rows[0] as Record<string, unknown>) : null;
}

/** 转科后更新入院记录的当前床位/病区（保持 status=admitted） */
export async function updateAdmissionLocation(
  visitId: string,
  loc: { wardId: string; bedId: string; department: string },
  tx: DbExecutor,
): Promise<Admission | null> {
  const rows = await tx`
    UPDATE clinical.admissions
    SET ward_id = ${loc.wardId}, bed_id = ${loc.bedId}, department = ${loc.department},
        status = 'admitted', updated_at = now()
    WHERE visit_id = ${visitId}
    RETURNING ${tx.unsafe(ADMISSION_COLS)}
  `;
  return rows.length > 0 ? mapAdmission(rows[0] as Record<string, unknown>) : null;
}

/** 出院：置状态与出院时间 */
export async function markAdmissionDischarged(
  visitId: string,
  dischargedAt: string,
  tx: DbExecutor,
): Promise<Admission | null> {
  const rows = await tx`
    UPDATE clinical.admissions
    SET status = 'discharged', discharged_at = ${dischargedAt}, updated_at = now()
    WHERE visit_id = ${visitId}
    RETURNING ${tx.unsafe(ADMISSION_COLS)}
  `;
  return rows.length > 0 ? mapAdmission(rows[0] as Record<string, unknown>) : null;
}

/* ----------------------------- ADT 事件 ------------------------------ */

export type AdtEventType = 'admit' | 'bed_change' | 'transfer' | 'discharge';

export interface AdtEvent {
  id: string;
  visitId: string;
  patientId: string;
  eventType: AdtEventType;
  fromWardId: string | null;
  toWardId: string | null;
  fromBedId: string | null;
  toBedId: string | null;
  fromDepartment: string | null;
  toDepartment: string | null;
  reason: string | null;
  operatorId: string | null;
  eventAt: string;
  createdAt: string;
}

const ADT_COLS = `
  id, visit_id, patient_id, event_type, from_ward_id, to_ward_id, from_bed_id, to_bed_id,
  from_department, to_department, reason, operator_id, event_at, created_at
`;

function mapAdtEvent(row: Record<string, unknown>): AdtEvent {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    eventType: row.event_type as AdtEventType,
    fromWardId: row.from_ward_id ? String(row.from_ward_id) : null,
    toWardId: row.to_ward_id ? String(row.to_ward_id) : null,
    fromBedId: row.from_bed_id ? String(row.from_bed_id) : null,
    toBedId: row.to_bed_id ? String(row.to_bed_id) : null,
    fromDepartment: row.from_department ? String(row.from_department) : null,
    toDepartment: row.to_department ? String(row.to_department) : null,
    reason: row.reason ? String(row.reason) : null,
    operatorId: row.operator_id ? String(row.operator_id) : null,
    eventAt: String(row.event_at),
    createdAt: String(row.created_at),
  };
}

export interface AdtEventInput {
  visitId: string;
  patientId: string;
  eventType: AdtEventType;
  fromWardId?: string | null;
  toWardId?: string | null;
  fromBedId?: string | null;
  toBedId?: string | null;
  fromDepartment?: string | null;
  toDepartment?: string | null;
  reason?: string | null;
  operatorId: string;
  eventAt?: string;
}

export async function createAdtEvent(input: AdtEventInput, tx: DbExecutor): Promise<AdtEvent> {
  const rows = await tx`
    INSERT INTO clinical.adt_events (
      visit_id, patient_id, event_type, from_ward_id, to_ward_id, from_bed_id, to_bed_id,
      from_department, to_department, reason, operator_id, event_at
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${input.eventType},
      ${input.fromWardId ?? null}, ${input.toWardId ?? null},
      ${input.fromBedId ?? null}, ${input.toBedId ?? null},
      ${input.fromDepartment ?? null}, ${input.toDepartment ?? null},
      ${input.reason ?? null}, ${input.operatorId},
      ${input.eventAt ?? new Date().toISOString()}
    )
    RETURNING ${tx.unsafe(ADT_COLS)}
  `;
  return mapAdtEvent(rows[0] as Record<string, unknown>);
}

export async function listAdtEvents(visitId: string, sql?: DbExecutor): Promise<AdtEvent[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ADT_COLS)} FROM clinical.adt_events
    WHERE visit_id = ${visitId} ORDER BY event_at, created_at
  `;
  return (rows as Record<string, unknown>[]).map(mapAdtEvent);
}

/* -------------------------- 在院患者读模型 ---------------------------- */

/** 在院（ongoing 住院就诊）联表记录，供在院列表/床位患者摘要映射 */
export interface InpatientRecordRow {
  visitId: string;
  visitNo: string;
  patientId: string;
  mrn: string;
  nameMasked: string;
  gender: string;
  birthDate: string | null;
  department: string;
  wardId: string | null;
  wardName: string | null;
  bedId: string | null;
  bedNo: string | null;
  roomNo: string | null;
  attendingDoctorId: string | null;
  diagnosis: string | null;
  condition: ConditionLevel | null;
  admittedAt: string | null;
  allergies: Array<Record<string, unknown>>;
  tags: string[];
}

export interface InpatientFilter {
  department?: string | null;
  wardId?: string | null;
  campusCode?: string | null;
}

export async function findCurrentInpatients(
  filter: InpatientFilter = {},
  sql?: DbExecutor,
): Promise<InpatientRecordRow[]> {
  const db = sql ?? getDb();
  const department = filter.department ?? null;
  const wardId = filter.wardId ?? null;
  const campusCode = filter.campusCode ?? null;

  const rows = await db`
    SELECT
      v.id AS visit_id, v.visit_no, v.patient_id, p.mrn, p.name_masked, p.gender, p.birth_date,
      v.department, v.ward_id, w.name AS ward_name, v.bed_id, b.bed_no, b.room_no,
      v.attending_doctor_id,
      COALESCE(a.diagnosis, v.chief_complaint) AS diagnosis,
      a.condition_on_admission AS condition,
      v.admit_at AS admitted_at,
      p.allergies, p.tags
    FROM clinical.visits v
    JOIN clinical.patients p ON p.id = v.patient_id
    LEFT JOIN clinical.admissions a ON a.visit_id = v.id
    LEFT JOIN clinical.wards w ON w.id = v.ward_id
    LEFT JOIN clinical.beds b ON b.id = v.bed_id
    LEFT JOIN clinical.campuses c ON c.id = w.campus_id
    WHERE v.visit_type = 'inpatient' AND v.status = 'ongoing'
      AND (${department}::text IS NULL OR v.department = ${department})
      AND (${wardId}::uuid IS NULL OR v.ward_id = ${wardId})
      AND (${campusCode}::text IS NULL OR c.code = ${campusCode})
    ORDER BY v.admit_at DESC
  `;

  return (rows as Record<string, unknown>[]).map((r) => ({
    visitId: String(r.visit_id),
    visitNo: String(r.visit_no),
    patientId: String(r.patient_id),
    mrn: String(r.mrn),
    nameMasked: String(r.name_masked),
    gender: String(r.gender),
    birthDate: r.birth_date ? String(r.birth_date) : null,
    department: String(r.department),
    wardId: r.ward_id ? String(r.ward_id) : null,
    wardName: r.ward_name ? String(r.ward_name) : null,
    bedId: r.bed_id ? String(r.bed_id) : null,
    bedNo: r.bed_no ? String(r.bed_no) : null,
    roomNo: r.room_no ? String(r.room_no) : null,
    attendingDoctorId: r.attending_doctor_id ? String(r.attending_doctor_id) : null,
    diagnosis: r.diagnosis ? String(r.diagnosis) : null,
    condition: r.condition ? (r.condition as ConditionLevel) : null,
    admittedAt: r.admitted_at ? String(r.admitted_at) : null,
    allergies: (r.allergies as Array<Record<string, unknown>>) ?? [],
    tags: (r.tags as string[]) ?? [],
  }));
}
