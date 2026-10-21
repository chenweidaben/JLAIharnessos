/**
 * 健澜科技 jlmedaios - M586 新标准 P11：预约挂号 4 端点
 *
 * GET  /api/v1/appointments?patientId=&doctorId=&date=   列表（createdAt 倒序；过滤；GET 时自动判定 noShow）
 * POST /api/v1/appointments                            新建（同 patient+doctor+date+slot 已 booked 409 already_booked）
 * POST /api/v1/appointments/:id/cancel                  取消（booked→cancelled；已 cancelled/checkedIn/completed 409 already_cancelled）
 * POST /api/v1/appointments/:id/checkin                签到（booked→checkedIn；已 checkedIn 409 already_checked_in；已 cancelled 409 appointment_cancelled）
 *
 * noShow 自动判定：status='booked' 且 appointmentDate < now-2h → noShow=true。
 * 种子 20 条：含 2 条 no_show（appointmentDate 已过未签到 booked）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type VisitType = 'outpatient' | 'expert' | 'special';
type ApptSource = 'onsite' | 'wechat' | 'app';
type ApptStatus = 'booked' | 'cancelled' | 'completed' | 'checkedIn';

interface ApptRecord {
  id: string;
  patientId: string;
  doctorId: string;
  deptCode: string;
  appointmentDate: string;
  timeSlot: string;
  visitType: VisitType;
  source: ApptSource;
  status: ApptStatus;
  noShow: boolean;
  cancelledBy: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  checkedInAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const apptStore = new Map<string, ApptRecord>();
let apptSeq = 0;

function addAppt(r: Omit<ApptRecord, 'id' | 'noShow'>): ApptRecord {
  apptSeq += 1;
  const rec: ApptRecord = { ...r, noShow: false, id: `APPT-${String(apptSeq).padStart(3, '0')}` };
  apptStore.set(rec.id, rec);
  return rec;
}

function isNoShow(rec: ApptRecord, nowMs: number): boolean {
  if (rec.status !== 'booked') return false;
  const apptMs = Date.parse(rec.appointmentDate);
  if (!Number.isFinite(apptMs)) return false;
  return nowMs - apptMs > 2 * 60 * 60_000;
}

function seedAppt(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const future = (offsetHour: number): string => new Date(now + offsetHour * 60 * 60_000).toISOString();

  // 2 条 no_show（booked 且 appointmentDate 已过 2h）
  for (let i = 1; i <= 2; i++) {
    addAppt({
      patientId: `P-A${String(i).padStart(3, '0')}`, doctorId: 'DOC-INT-001', deptCode: 'internal',
      appointmentDate: iso(60 * 5), timeSlot: '09:30-10:00', visitType: 'outpatient', source: 'wechat',
      status: 'booked', cancelledBy: null, cancelReason: null, cancelledAt: null, checkedInAt: null,
      createdAt: iso(60 * 24 * 2),
    });
  }

  // 3 checkedIn
  for (let i = 3; i <= 5; i++) {
    addAppt({
      patientId: `P-A${String(i).padStart(3, '0')}`, doctorId: 'DOC-SUR-001', deptCode: 'surgery',
      appointmentDate: iso(-30), timeSlot: '08:30-09:00', visitType: 'outpatient', source: 'onsite',
      status: 'checkedIn', cancelledBy: null, cancelReason: null, cancelledAt: null, checkedInAt: iso(-15),
      createdAt: iso(60 * 24 * 1),
    });
  }

  // 2 cancelled
  for (let i = 6; i <= 7; i++) {
    addAppt({
      patientId: `P-A${String(i).padStart(3, '0')}`, doctorId: 'DOC-CARD-001', deptCode: 'cardiology',
      appointmentDate: future(5), timeSlot: '10:00-10:30', visitType: 'follow-up' as VisitType, source: 'app',
      status: 'cancelled', cancelledBy: 'PATIENT', cancelReason: '临时有事', cancelledAt: iso(-60 * 2),
      checkedInAt: null,
      createdAt: iso(60 * 24 * 1),
    });
  }

  // 13 booked（未来）
  for (let i = 8; i <= 20; i++) {
    addAppt({
      patientId: `P-A${String(i).padStart(3, '0')}`,
      doctorId: `DOC-${i % 3 === 0 ? 'NEURO' : i % 3 === 1 ? 'PEDS' : 'INT'}-001`,
      deptCode: i % 3 === 0 ? 'neurology' : i % 3 === 1 ? 'pediatrics' : 'internal',
      appointmentDate: future(24 * (i - 7)), timeSlot: `09:${((i * 7) % 30) + 30}-${((i * 7) % 30) + 60}`,
      visitType: i % 2 === 0 ? 'outpatient' : 'expert',
      source: (['onsite', 'wechat', 'app'] as ApptSource[])[i % 3],
      status: 'booked', cancelledBy: null, cancelReason: null, cancelledAt: null, checkedInAt: null,
      createdAt: iso(60 * 24 * (21 - i)),
    });
  }
}
seedAppt();

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

const VALID_VISIT_TYPES: VisitType[] = ['outpatient', 'expert', 'special'];
const VALID_SOURCES: ApptSource[] = ['onsite', 'wechat', 'app'];

// ============================== 1. GET /api/v1/appointments ==============================

async function handleApptList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const doctorId = (c.query.get('doctorId') ?? '').trim();
  const date = (c.query.get('date') ?? '').trim();

  const nowMs = Date.now();
  let rows = Array.from(apptStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (doctorId) rows = rows.filter((r) => r.doctorId === doctorId);
  if (date) rows = rows.filter((r) => r.appointmentDate.startsWith(date));
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // GET 时自动判定 noShow
  const items = rows.map((r) => ({ ...r, noShow: isNoShow(r, nowMs) }));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. POST /api/v1/appointments ==============================

async function handleApptCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { patientId, doctorId, deptCode, appointmentDate, timeSlot, visitType, source } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof doctorId !== 'string' || !doctorId.trim() ||
    typeof deptCode !== 'string' || !deptCode.trim() ||
    typeof appointmentDate !== 'string' || !appointmentDate.trim() ||
    typeof timeSlot !== 'string' || !timeSlot.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof visitType !== 'string' || !VALID_VISIT_TYPES.includes(visitType as VisitType)) {
    return json({ code: 400, message: 'invalid_visit_type' }, 400);
  }
  if (typeof source !== 'string' || !VALID_SOURCES.includes(source as ApptSource)) {
    return json({ code: 400, message: 'invalid_source' }, 400);
  }

  // 同 patientId+doctorId+appointmentDate+timeSlot 已有 booked
  const dup = Array.from(apptStore.values()).find(
    (r) => r.patientId === patientId.trim() && r.doctorId === doctorId.trim() &&
      r.appointmentDate === appointmentDate.trim() && r.timeSlot === timeSlot.trim() && r.status === 'booked',
  );
  if (dup) return json({ code: 409, message: 'already_booked' }, 409);

  const rec = addAppt({
    patientId: patientId.trim(),
    doctorId: doctorId.trim(),
    deptCode: deptCode.trim(),
    appointmentDate: appointmentDate.trim(),
    timeSlot: timeSlot.trim(),
    visitType: visitType as VisitType,
    source: source as ApptSource,
    status: 'booked',
    cancelledBy: null, cancelReason: null, cancelledAt: null, checkedInAt: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/appointments/:id/cancel ==============================

async function handleApptCancel(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = apptStore.get(id);
  if (!rec) return notFound('Appointment', id);

  if (rec.status !== 'booked') {
    return json({ code: 409, message: 'already_cancelled' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { cancelReason, cancelledBy } = body as Record<string, unknown>;
  if (
    typeof cancelReason !== 'string' || !cancelReason.trim() ||
    typeof cancelledBy !== 'string' || !cancelledBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'cancelled';
  rec.cancelReason = cancelReason.trim();
  rec.cancelledBy = cancelledBy.trim();
  rec.cancelledAt = new Date().toISOString();
  return json(ok(rec), 200);
}

// ============================== 4. POST /api/v1/appointments/:id/checkin ==============================

async function handleApptCheckin(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = apptStore.get(id);
  if (!rec) return notFound('Appointment', id);

  if (rec.status === 'checkedIn') return json({ code: 409, message: 'already_checked_in' }, 409);
  if (rec.status === 'cancelled') return json({ code: 409, message: 'appointment_cancelled' }, 409);
  if (rec.status === 'completed') return json({ code: 409, message: 'already_completed' }, 409);

  rec.status = 'checkedIn';
  rec.checkedInAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m586Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/appointments', handle: handleApptList, auth: true },
  { method: 'POST', path: '/api/v1/appointments', handle: handleApptCreate, auth: true },
  { method: 'POST', path: '/api/v1/appointments/:id/cancel', handle: handleApptCancel, auth: true },
  { method: 'POST', path: '/api/v1/appointments/:id/checkin', handle: handleApptCheckin, auth: true },
];
