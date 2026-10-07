/**
 * 健澜科技 jlmedaios - RIS 检查全流程 Repository（M11-B）
 *
 * clinical.imaging_exams / imaging_devices / imaging_device_slots / imaging_requests /
 * imaging_request_items / imaging_appointments / imaging_studies 读写，以及
 * clinical.imaging_reports 草稿与状态推进 upsert。
 *
 * 并发与一致性：
 *  - 申请号 request_no / 预约号 appointment_no / study_uid 唯一，重复幂等返回既有；
 *  - 报告按 study_id 建草稿，重复建返回既有（created=false）；
 *  - 预约在事务内锁 slot FOR UPDATE，booked_count < capacity 方可 +1（防约满）；
 *  - 申请/预约/study/报告状态推进一律 FOR UPDATE 行锁 + 应用层状态白名单（规则引擎）；
 *  - 数组参数化 IN 用 ${db(array)}。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

// ---------------------------------------------------------------------------
// 目录：检查项目 / 设备 / 时段
// ---------------------------------------------------------------------------

export interface ImagingExam {
  id: string;
  examCode: string;
  name: string;
  modality: string;
  bodyPart: string | null;
  execDepartment: string;
  defaultDeviceId: string | null;
  price: number;
  needsScheduling: boolean;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImagingDevice {
  id: string;
  deviceCode: string;
  name: string;
  modality: string;
  room: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImagingDeviceSlot {
  id: string;
  deviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isActive: boolean;
  createdAt: string;
}

const EXAM_COLS = `
  id, exam_code, name, modality, body_part, exec_department, default_device_id,
  price, needs_scheduling, duration_minutes, is_active, created_at, updated_at
`;
const DEVICE_COLS = `
  id, device_code, name, modality, room, is_active, created_at, updated_at
`;
const SLOT_COLS = `
  id, device_id, slot_date::text AS slot_date, start_time::text AS start_time,
  end_time::text AS end_time, capacity, booked_count, is_active, created_at
`;

function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function mapExam(row: Record<string, unknown>): ImagingExam {
  return {
    id: String(row.id),
    examCode: String(row.exam_code),
    name: String(row.name),
    modality: String(row.modality),
    bodyPart: row.body_part ? String(row.body_part) : null,
    execDepartment: String(row.exec_department),
    defaultDeviceId: row.default_device_id ? String(row.default_device_id) : null,
    price: Number(row.price),
    needsScheduling: Boolean(row.needs_scheduling),
    durationMinutes: Number(row.duration_minutes),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDevice(row: Record<string, unknown>): ImagingDevice {
  return {
    id: String(row.id),
    deviceCode: String(row.device_code),
    name: String(row.name),
    modality: String(row.modality),
    room: row.room ? String(row.room) : null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSlot(row: Record<string, unknown>): ImagingDeviceSlot {
  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    slotDate: String(row.slot_date),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    capacity: Number(row.capacity),
    bookedCount: Number(row.booked_count),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
  };
}

export async function listExams(sql?: DbExecutor): Promise<ImagingExam[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(EXAM_COLS)} FROM clinical.imaging_exams
    WHERE is_active = true ORDER BY exam_code ASC`;
  return (rows as Record<string, unknown>[]).map((r) => mapExam(r));
}

export async function listDevices(sql?: DbExecutor): Promise<ImagingDevice[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(DEVICE_COLS)} FROM clinical.imaging_devices
    WHERE is_active = true ORDER BY device_code ASC`;
  return (rows as Record<string, unknown>[]).map((r) => mapDevice(r));
}

export async function getExamById(id: string, sql?: DbExecutor): Promise<ImagingExam | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(EXAM_COLS)} FROM clinical.imaging_exams WHERE id = ${id}`;
  return rows.length > 0 ? mapExam(rows[0] as Record<string, unknown>) : null;
}

export async function getDeviceById(id: string, sql?: DbExecutor): Promise<ImagingDevice | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(DEVICE_COLS)} FROM clinical.imaging_devices WHERE id = ${id}`;
  return rows.length > 0 ? mapDevice(rows[0] as Record<string, unknown>) : null;
}

export async function createExam(
  input: {
    examCode: string; name: string; modality: string;
    bodyPart?: string | null; price?: number;
    needsScheduling?: boolean; durationMinutes?: number;
  },
  tx: DbExecutor,
): Promise<{ exam: ImagingExam; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(EXAM_COLS)} FROM clinical.imaging_exams WHERE exam_code = ${input.examCode}`;
  if (existing.length > 0) return { exam: mapExam(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.imaging_exams
      (exam_code, name, modality, body_part, price, needs_scheduling, duration_minutes)
    VALUES
      (${input.examCode}, ${input.name}, ${input.modality}, ${input.bodyPart ?? null},
       ${input.price ?? 0}, ${input.needsScheduling ?? true}, ${input.durationMinutes ?? 15})
    ON CONFLICT (exam_code) DO NOTHING
    RETURNING ${tx.unsafe(EXAM_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(EXAM_COLS)} FROM clinical.imaging_exams WHERE exam_code = ${input.examCode}`;
    return { exam: mapExam(back[0]), created: false };
  }
  return { exam: mapExam(rows[0]), created: true };
}

export async function createDevice(
  input: { deviceCode: string; name: string; modality: string; room?: string | null },
  tx: DbExecutor,
): Promise<{ device: ImagingDevice; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(DEVICE_COLS)} FROM clinical.imaging_devices WHERE device_code = ${input.deviceCode}`;
  if (existing.length > 0) return { device: mapDevice(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.imaging_devices (device_code, name, modality, room)
    VALUES (${input.deviceCode}, ${input.name}, ${input.modality}, ${input.room ?? null})
    ON CONFLICT (device_code) DO NOTHING
    RETURNING ${tx.unsafe(DEVICE_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(DEVICE_COLS)} FROM clinical.imaging_devices WHERE device_code = ${input.deviceCode}`;
    return { device: mapDevice(back[0]), created: false };
  }
  return { device: mapDevice(rows[0]), created: true };
}

export async function createSlot(
  input: {
    deviceId: string; slotDate: string; startTime: string; endTime: string; capacity?: number;
  },
  tx: DbExecutor,
): Promise<{ slot: ImagingDeviceSlot; created: boolean }> {
  const rows = await tx`
    INSERT INTO clinical.imaging_device_slots (device_id, slot_date, start_time, end_time, capacity)
    VALUES (${input.deviceId}, ${input.slotDate}, ${input.startTime}, ${input.endTime}, ${input.capacity ?? 1})
    ON CONFLICT (device_id, slot_date, start_time) DO NOTHING
    RETURNING ${tx.unsafe(SLOT_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(SLOT_COLS)} FROM clinical.imaging_device_slots
      WHERE device_id = ${input.deviceId} AND slot_date = ${input.slotDate} AND start_time = ${input.startTime}`;
    return { slot: mapSlot(back[0]), created: false };
  }
  return { slot: mapSlot(rows[0]), created: true };
}

export async function listSlots(
  filter: { deviceId?: string; date?: string } = {},
  sql?: DbExecutor,
): Promise<ImagingDeviceSlot[]> {
  const db = sql ?? getDb();
  let where = db`WHERE is_active = true`;
  if (filter.deviceId) where = db`${where} AND device_id = ${filter.deviceId}`;
  if (filter.date) where = db`${where} AND slot_date = ${filter.date}`;
  const rows = await db`
    SELECT ${db.unsafe(SLOT_COLS)} FROM clinical.imaging_device_slots
    ${where}
    ORDER BY slot_date ASC, start_time ASC`;
  return (rows as Record<string, unknown>[]).map((r) => mapSlot(r));
}

// ---------------------------------------------------------------------------
// 时段：FOR UPDATE 行锁 + 容量计数（防约满）
// ---------------------------------------------------------------------------

export async function lockSlotById(id: string, tx: DbExecutor): Promise<ImagingDeviceSlot | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(SLOT_COLS)} FROM clinical.imaging_device_slots WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapSlot(rows[0] as Record<string, unknown>) : null;
}

/** 预约成功：booked_count +1（调用方已在锁内校验 booked_count < capacity）。 */
export async function incSlotBooked(id: string, tx: DbExecutor): Promise<void> {
  await tx`
    UPDATE clinical.imaging_device_slots
    SET booked_count = booked_count + 1 WHERE id = ${id}`;
}

/** 取消预约：booked_count -1，不低于 0。 */
export async function decSlotBooked(id: string, tx: DbExecutor): Promise<void> {
  await tx`
    UPDATE clinical.imaging_device_slots
    SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = ${id}`;
}

// ---------------------------------------------------------------------------
// 检查申请与申请项目行
// ---------------------------------------------------------------------------

export interface ImagingRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  orderedBy: string | null;
  urgency: string;
  diagnosis: string | null;
  chiefComplaint: string | null;
  status: string;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImagingRequestItem {
  id: string;
  requestId: string;
  examId: string;
  createdAt: string;
}

const REQUEST_COLS = `
  id, request_no, visit_id, patient_id, ordered_by, urgency, diagnosis, chief_complaint,
  status, cancelled_by, cancelled_at, cancel_reason, created_at, updated_at
`;

function mapRequest(row: Record<string, unknown>): ImagingRequest {
  return {
    id: String(row.id),
    requestNo: String(row.request_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    orderedBy: row.ordered_by ? String(row.ordered_by) : null,
    urgency: String(row.urgency),
    diagnosis: row.diagnosis ? String(row.diagnosis) : null,
    chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : null,
    status: String(row.status),
    cancelledBy: row.cancelled_by ? String(row.cancelled_by) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    cancelReason: row.cancel_reason ? String(row.cancel_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createRequest(
  input: {
    requestNo: string;
    visitId: string;
    patientId: string;
    orderedBy: string | null;
    urgency: string;
    diagnosis?: string | null;
    chiefComplaint?: string | null;
  },
  tx: DbExecutor,
): Promise<{ req: ImagingRequest; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(REQUEST_COLS)} FROM clinical.imaging_requests WHERE request_no = ${input.requestNo}`;
  if (existing.length > 0) return { req: mapRequest(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.imaging_requests
      (request_no, visit_id, patient_id, ordered_by, urgency, diagnosis, chief_complaint)
    VALUES
      (${input.requestNo}, ${input.visitId}, ${input.patientId}, ${input.orderedBy},
       ${input.urgency}, ${input.diagnosis ?? null}, ${input.chiefComplaint ?? null})
    ON CONFLICT (request_no) DO NOTHING
    RETURNING ${tx.unsafe(REQUEST_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(REQUEST_COLS)} FROM clinical.imaging_requests WHERE request_no = ${input.requestNo}`;
    return { req: mapRequest(back[0]), created: false };
  }
  return { req: mapRequest(rows[0]), created: true };
}

export async function addRequestItem(
  input: { requestId: string; examId: string },
  tx: DbExecutor,
): Promise<void> {
  await tx`
    INSERT INTO clinical.imaging_request_items (request_id, exam_id)
    VALUES (${input.requestId}, ${input.examId})
    ON CONFLICT (request_id, exam_id) DO NOTHING`;
}

export async function getRequestById(id: string, sql?: DbExecutor): Promise<ImagingRequest | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(REQUEST_COLS)} FROM clinical.imaging_requests WHERE id = ${id}`;
  return rows.length > 0 ? mapRequest(rows[0] as Record<string, unknown>) : null;
}

export async function lockRequestById(id: string, tx: DbExecutor): Promise<ImagingRequest | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(REQUEST_COLS)} FROM clinical.imaging_requests WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapRequest(rows[0] as Record<string, unknown>) : null;
}

export async function getRequestItems(requestId: string, tx?: DbExecutor): Promise<ImagingRequestItem[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT id, request_id, exam_id, created_at
    FROM clinical.imaging_request_items WHERE request_id = ${requestId}
    ORDER BY created_at ASC, id ASC`;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    requestId: String(r.request_id),
    examId: String(r.exam_id),
    createdAt: String(r.created_at),
  }));
}

export async function listRequests(
  filter: { status?: string; patientId?: string; visitId?: string } = {},
  sql?: DbExecutor,
): Promise<ImagingRequest[]> {
  const db = sql ?? getDb();
  let where = db`WHERE 1 = 1`;
  if (filter.status) where = db`${where} AND status = ${filter.status}`;
  if (filter.patientId) where = db`${where} AND patient_id = ${filter.patientId}`;
  if (filter.visitId) where = db`${where} AND visit_id = ${filter.visitId}`;
  const rows = await db`
    SELECT ${db.unsafe(REQUEST_COLS)} FROM clinical.imaging_requests
    ${where}
    ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => mapRequest(r));
}

/** 通用动态 UPDATE（状态推进与取消等共用）。 */
export async function patchRequest(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
): Promise<ImagingRequest> {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.imaging_requests SET ${setClause}, updated_at = now()
     WHERE id = $${cols.length + 1} RETURNING ${REQUEST_COLS}`,
    [...values, id],
  );
  return mapRequest(rows[0] as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 预约安排
// ---------------------------------------------------------------------------

export interface ImagingAppointment {
  id: string;
  appointmentNo: string;
  requestId: string;
  examId: string;
  slotId: string;
  deviceId: string;
  scheduledStart: string;
  status: string;
  checkedInAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const APPOINTMENT_COLS = `
  id, appointment_no, request_id, exam_id, slot_id, device_id, scheduled_start,
  status, checked_in_at, created_by, created_at, updated_at
`;

function mapAppointment(row: Record<string, unknown>): ImagingAppointment {
  return {
    id: String(row.id),
    appointmentNo: String(row.appointment_no),
    requestId: String(row.request_id),
    examId: String(row.exam_id),
    slotId: String(row.slot_id),
    deviceId: String(row.device_id),
    scheduledStart: String(row.scheduled_start),
    status: String(row.status),
    checkedInAt: row.checked_in_at ? String(row.checked_in_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function insertAppointment(
  input: {
    appointmentNo: string;
    requestId: string;
    examId: string;
    slotId: string;
    deviceId: string;
    scheduledStart: string;
    createdBy: string;
  },
  tx: DbExecutor,
): Promise<ImagingAppointment> {
  const rows = await tx`
    INSERT INTO clinical.imaging_appointments
      (appointment_no, request_id, exam_id, slot_id, device_id, scheduled_start, created_by)
    VALUES
      (${input.appointmentNo}, ${input.requestId}, ${input.examId}, ${input.slotId},
       ${input.deviceId}, ${input.scheduledStart}, ${input.createdBy})
    RETURNING ${tx.unsafe(APPOINTMENT_COLS)}`;
  return mapAppointment(rows[0] as Record<string, unknown>);
}

export async function getAppointmentById(id: string, sql?: DbExecutor): Promise<ImagingAppointment | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(APPOINTMENT_COLS)} FROM clinical.imaging_appointments WHERE id = ${id}`;
  return rows.length > 0 ? mapAppointment(rows[0] as Record<string, unknown>) : null;
}

export async function lockAppointmentById(id: string, tx: DbExecutor): Promise<ImagingAppointment | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(APPOINTMENT_COLS)} FROM clinical.imaging_appointments WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapAppointment(rows[0] as Record<string, unknown>) : null;
}

export async function patchAppointment(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
): Promise<ImagingAppointment> {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.imaging_appointments SET ${setClause}, updated_at = now()
     WHERE id = $${cols.length + 1} RETURNING ${APPOINTMENT_COLS}`,
    [...values, id],
  );
  return mapAppointment(rows[0] as Record<string, unknown>);
}

export async function listAppointments(
  filter: { status?: string; requestId?: string } = {},
  sql?: DbExecutor,
): Promise<ImagingAppointment[]> {
  const db = sql ?? getDb();
  let where = db`WHERE 1 = 1`;
  if (filter.status) where = db`${where} AND status = ${filter.status}`;
  if (filter.requestId) where = db`${where} AND request_id = ${filter.requestId}`;
  const rows = await db`
    SELECT ${db.unsafe(APPOINTMENT_COLS)} FROM clinical.imaging_appointments
    ${where}
    ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => mapAppointment(r));
}

// ---------------------------------------------------------------------------
// 检查执行 / DICOM Study
// ---------------------------------------------------------------------------

export interface ImagingStudy {
  id: string;
  studyUid: string;
  appointmentId: string;
  requestId: string;
  examId: string;
  deviceId: string;
  modality: string;
  status: string;
  performedBy: string;
  performedAt: string;
  imageRefs: string[];
  createdAt: string;
  updatedAt: string;
}

const STUDY_COLS = `
  id, study_uid, appointment_id, request_id, exam_id, device_id, modality, status,
  performed_by, performed_at, image_refs, created_at, updated_at
`;

function mapStudy(row: Record<string, unknown>): ImagingStudy {
  const raw = row.image_refs;
  const imageRefs = Array.isArray(raw) ? (raw as unknown[]).map(String) : [];
  return {
    id: String(row.id),
    studyUid: String(row.study_uid),
    appointmentId: String(row.appointment_id),
    requestId: String(row.request_id),
    examId: String(row.exam_id),
    deviceId: String(row.device_id),
    modality: String(row.modality),
    status: String(row.status),
    performedBy: String(row.performed_by),
    performedAt: String(row.performed_at),
    imageRefs,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function insertStudy(
  input: {
    studyUid: string;
    appointmentId: string;
    requestId: string;
    examId: string;
    deviceId: string;
    modality: string;
    performedBy: string;
  },
  tx: DbExecutor,
): Promise<ImagingStudy> {
  const rows = await tx`
    INSERT INTO clinical.imaging_studies
      (study_uid, appointment_id, request_id, exam_id, device_id, modality, performed_by)
    VALUES
      (${input.studyUid}, ${input.appointmentId}, ${input.requestId}, ${input.examId},
       ${input.deviceId}, ${input.modality}, ${input.performedBy})
    RETURNING ${tx.unsafe(STUDY_COLS)}`;
  return mapStudy(rows[0] as Record<string, unknown>);
}

export async function getStudyById(id: string, sql?: DbExecutor): Promise<ImagingStudy | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(STUDY_COLS)} FROM clinical.imaging_studies WHERE id = ${id}`;
  return rows.length > 0 ? mapStudy(rows[0] as Record<string, unknown>) : null;
}

export async function lockStudyById(id: string, tx: DbExecutor): Promise<ImagingStudy | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(STUDY_COLS)} FROM clinical.imaging_studies WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapStudy(rows[0] as Record<string, unknown>) : null;
}

export async function listStudies(
  filter: { requestId?: string } = {},
  sql?: DbExecutor,
): Promise<ImagingStudy[]> {
  const db = sql ?? getDb();
  let where = db`WHERE 1 = 1`;
  if (filter.requestId) where = db`${where} AND request_id = ${filter.requestId}`;
  const rows = await db`
    SELECT ${db.unsafe(STUDY_COLS)} FROM clinical.imaging_studies
    ${where}
    ORDER BY performed_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => mapStudy(r));
}

/** 登记/覆盖 study 图像引用（幂等：整列覆盖为传入数组）。 */
export async function setStudyImages(
  id: string,
  imageRefs: string[],
  tx: DbExecutor,
): Promise<ImagingStudy> {
  const rows = await tx`
    UPDATE clinical.imaging_studies
    SET image_refs = ${tx.json(imageRefs)}::jsonb, updated_at = now()
    WHERE id = ${id}
    RETURNING ${tx.unsafe(STUDY_COLS)}`;
  return mapStudy(rows[0] as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 影像报告（扩展自 imaging_reports）
// ---------------------------------------------------------------------------

export interface ImagingReport {
  id: string;
  reportNo: string | null;
  visitId: string;
  patientId: string;
  studyUid: string | null;
  modality: string | null;
  examName: string;
  bodyPart: string | null;
  findings: string | null;
  impression: string | null;
  aiFindings: unknown;
  isCritical: boolean;
  reportTime: string | null;
  imageRefs: string[];
  status: string;
  requestId: string | null;
  appointmentId: string | null;
  studyId: string | null;
  examId: string | null;
  writtenBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  returnedBy: string | null;
  returnedAt: string | null;
  returnReason: string | null;
  createdAt: string;
}

const IR_COLS = `
  id, report_no, visit_id, patient_id, study_uid, modality, exam_name, body_part,
  findings, impression, ai_findings, is_critical, report_time, image_refs,
  status, request_id, appointment_id, study_id, exam_id, written_by, submitted_at,
  reviewed_by, reviewed_at, published_by, published_at, returned_by, returned_at,
  return_reason, created_at
`;

function mapImagingReport(row: Record<string, unknown>): ImagingReport {
  const rawImgs = row.image_refs;
  const imageRefs = Array.isArray(rawImgs) ? (rawImgs as unknown[]).map(String) : [];
  return {
    id: String(row.id),
    reportNo: row.report_no ? String(row.report_no) : null,
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    studyUid: row.study_uid ? String(row.study_uid) : null,
    modality: row.modality ? String(row.modality) : null,
    examName: String(row.exam_name),
    bodyPart: row.body_part ? String(row.body_part) : null,
    findings: row.findings ? String(row.findings) : null,
    impression: row.impression ? String(row.impression) : null,
    aiFindings: row.ai_findings ?? null,
    isCritical: Boolean(row.is_critical),
    reportTime: row.report_time ? String(row.report_time) : null,
    imageRefs,
    status: String(row.status),
    requestId: row.request_id ? String(row.request_id) : null,
    appointmentId: row.appointment_id ? String(row.appointment_id) : null,
    studyId: row.study_id ? String(row.study_id) : null,
    examId: row.exam_id ? String(row.exam_id) : null,
    writtenBy: row.written_by ? String(row.written_by) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    publishedBy: row.published_by ? String(row.published_by) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    returnedBy: row.returned_by ? String(row.returned_by) : null,
    returnedAt: row.returned_at ? String(row.returned_at) : null,
    returnReason: row.return_reason ? String(row.return_reason) : null,
    createdAt: String(row.created_at),
  };
}

/**
 * 按 study 建草稿报告：一个 study 一份报告，重复建返回既有（created=false）。
 */
export async function createReportForStudy(
  input: {
    reportNo: string;
    study: ImagingStudy;
    requestId: string;
    appointmentId: string;
    examId: string;
    visitId: string;
    patientId: string;
    examName: string;
    bodyPart: string | null;
  },
  tx: DbExecutor,
): Promise<{ report: ImagingReport; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(IR_COLS)} FROM clinical.imaging_reports WHERE study_id = ${input.study.id}`;
  if (existing.length > 0) return { report: mapImagingReport(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.imaging_reports
      (report_no, visit_id, patient_id, study_uid, modality, exam_name, body_part,
       image_refs, status, request_id, appointment_id, study_id, exam_id)
    VALUES
      (${input.reportNo}, ${input.visitId}, ${input.patientId}, ${input.study.studyUid},
       ${input.study.modality}, ${input.examName}, ${input.bodyPart},
       ${tx.json(input.study.imageRefs)}::jsonb, 'draft', ${input.requestId},
       ${input.appointmentId}, ${input.study.id}, ${input.examId})
    RETURNING ${tx.unsafe(IR_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(IR_COLS)} FROM clinical.imaging_reports WHERE study_id = ${input.study.id}`;
    return { report: mapImagingReport(back[0]), created: false };
  }
  return { report: mapImagingReport(rows[0]), created: true };
}

export async function getImagingReportById(id: string, sql?: DbExecutor): Promise<ImagingReport | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(IR_COLS)} FROM clinical.imaging_reports WHERE id = ${id}`;
  return rows.length > 0 ? mapImagingReport(rows[0] as Record<string, unknown>) : null;
}

export async function lockImagingReportById(id: string, tx: DbExecutor): Promise<ImagingReport | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(IR_COLS)} FROM clinical.imaging_reports WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapImagingReport(rows[0] as Record<string, unknown>) : null;
}

/** imaging_reports 无 updated_at 列，通用 UPDATE 仅 SET 指定字段。 */
export async function patchImagingReport(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
): Promise<ImagingReport> {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.imaging_reports SET ${setClause}
     WHERE id = $${cols.length + 1} RETURNING ${IR_COLS}`,
    [...values, id],
  );
  return mapImagingReport(rows[0] as Record<string, unknown>);
}

export async function getReportsByRequest(requestId: string, tx?: DbExecutor): Promise<ImagingReport[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(IR_COLS)} FROM clinical.imaging_reports
    WHERE request_id = ${requestId} ORDER BY created_at ASC`;
  return (rows as Record<string, unknown>[]).map((r) => mapImagingReport(r));
}

export async function listImagingReports(
  filter: { status?: string; patientId?: string; visitId?: string } = {},
  sql?: DbExecutor,
): Promise<ImagingReport[]> {
  const db = sql ?? getDb();
  let where = db`WHERE 1 = 1`;
  if (filter.status) where = db`${where} AND status = ${filter.status}`;
  if (filter.patientId) where = db`${where} AND patient_id = ${filter.patientId}`;
  if (filter.visitId) where = db`${where} AND visit_id = ${filter.visitId}`;
  const rows = await db`
    SELECT ${db.unsafe(IR_COLS)} FROM clinical.imaging_reports
    ${where}
    ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => mapImagingReport(r));
}

/**
 * 仅写入 AI 辅助检出结果到 ai_findings（jsonb）。
 * 医疗安全：不触碰 findings/impression，不改变报告状态（AI 仅辅助，不自动发布）。
 */
export async function setReportAiFindings(
  id: string,
  aiFindings: unknown,
  tx: DbExecutor,
): Promise<ImagingReport> {
  // toJson 得纯对象（JSON.parse(JSON.stringify)），db.json 再序列化为 jsonb；
  // 切勿直接传 JSON.stringify 的字符串（会被二次序列化、落为 string）。
  const rows = await tx`
    UPDATE clinical.imaging_reports
    SET ai_findings = ${tx.json(toJson(aiFindings))}::jsonb
    WHERE id = ${id}
    RETURNING ${tx.unsafe(IR_COLS)}`;
  return mapImagingReport(rows[0] as Record<string, unknown>);
}
