/**
 * 健澜AI原生医院操作系统OS - P3-1 患者互联网+服务门户
 *
 * 智慧服务三级对标：在线报告、图文咨询预约、满意度评价、就诊提醒、医保缴费。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class PortalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type ReportType = 'lab' | 'imaging' | 'prescription' | 'bill-summary';
export type ReminderChannel = 'in-app' | 'sms' | 'wechat';
export type BookingStatus = 'booked' | 'completed' | 'cancelled';

export interface Report { reportId: string; patientId: string; visitId: string; type: ReportType; title: string; result: string; issuedAt: string; readAt: string | null; }
export interface ConsultBooking { bookingId: string; patientId: string; doctorId: string; departmentId: string; scheduledAt: string; status: BookingStatus; note?: string; }
export interface SatisfactionSurvey { surveyId: string; patientId: string; visitId: string; doctorId: string; score: number; comment?: string; submittedAt: string; }
export interface Reminder { reminderId: string; patientId: string; channel: ReminderChannel; triggerAt: string; message: string; status: 'pending' | 'sent' | 'read'; relatedBookingId?: string; }
export interface PaymentRecord { paymentId: string; patientId: string; visitId: string; amountTotal: number; insuranceCovered: number; patientPaid: number; paidAt: string; method: 'wechat' | 'alipay' | 'cash' | 'insurance'; }
export interface AdminNotification { notifId: string; level: 'info' | 'warning'; message: string; createdAt: string; }

const reports: Report[] = [];
const bookings: ConsultBooking[] = [];
const surveys: SatisfactionSurvey[] = [];
const reminders: Reminder[] = [];
const payments: PaymentRecord[] = [];
const adminNotifs: AdminNotification[] = [];
let seq = 0;

function pick<T extends string>(v: unknown, allowed: readonly T[], label: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) throw new PortalError(400, `${label} 非法：${String(v)}`);
  return v as T;
}

const REPORT_TYPES: readonly ReportType[] = ['lab', 'imaging', 'prescription', 'bill-summary'];
const CHANNELS: readonly ReminderChannel[] = ['in-app', 'sms', 'wechat'];
const METHODS: readonly PaymentRecord['method'][] = ['wechat', 'alipay', 'cash', 'insurance'];

function gen(prefix: string): string { seq += 1; return `${prefix}-${String(seq).padStart(5, '0')}`; }

// ---------- Reports ----------
export function listReports(patientId: string, q: { type?: string; from?: string; to?: string }): Report[] {
  let arr = reports.filter((r) => r.patientId === patientId);
  if (q.type) {
    const t = pick(q.type, REPORT_TYPES, 'type');
    arr = arr.filter((r) => r.type === t);
  }
  if (q.from) arr = arr.filter((r) => r.issuedAt >= q.from!);
  if (q.to) arr = arr.filter((r) => r.issuedAt <= q.to!);
  return arr.sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
}

export function markReportRead(patientId: string, reportId: string): Report {
  const r = reports.find((x) => x.reportId === reportId);
  if (!r) throw new PortalError(404, `报告不存在：${reportId}`);
  if (r.patientId !== patientId) throw new PortalError(403, '只能读自己的报告');
  if (!r.readAt) r.readAt = new Date().toISOString();
  return r;
}

// ---------- Consult bookings ----------
export function createBooking(input: { patientId: string; doctorId: string; departmentId: string; scheduledAt: string; note?: string }): ConsultBooking {
  if (!input.doctorId || !input.departmentId || !input.scheduledAt) throw new PortalError(400, 'doctorId/departmentId/scheduledAt 必填');
  if (Number.isNaN(Date.parse(input.scheduledAt))) throw new PortalError(400, 'scheduledAt 非合法 ISO');
  if (new Date(input.scheduledAt).getTime() < Date.now()) throw new PortalError(400, 'scheduledAt 必须是未来时间');
  const b: ConsultBooking = { bookingId: gen('CB'), patientId: input.patientId, doctorId: input.doctorId, departmentId: input.departmentId, scheduledAt: input.scheduledAt, status: 'booked', note: input.note };
  bookings.push(b);
  // 自动生成 in-app reminder
  reminders.push({ reminderId: gen('RM'), patientId: input.patientId, channel: 'in-app', triggerAt: input.scheduledAt, message: `您预约的 ${input.departmentId} 图文咨询即将开始`, status: 'pending', relatedBookingId: b.bookingId });
  return b;
}

export function listBookings(patientId: string): ConsultBooking[] {
  return bookings.filter((b) => b.patientId === patientId).sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : -1));
}

export function cancelBooking(patientId: string, bookingId: string): ConsultBooking {
  const b = bookings.find((x) => x.bookingId === bookingId);
  if (!b) throw new PortalError(404, `预约不存在：${bookingId}`);
  if (b.patientId !== patientId) throw new PortalError(403, '只能取消自己的预约');
  if (b.status === 'cancelled') throw new PortalError(409, '预约已取消，重复取消');
  b.status = 'cancelled';
  return b;
}

// ---------- Satisfaction ----------
export function submitSatisfaction(input: { patientId: string; visitId: string; doctorId: string; score: number; comment?: string }): SatisfactionSurvey {
  if (!input.visitId || !input.doctorId) throw new PortalError(400, 'visitId/doctorId 必填');
  if (!Number.isFinite(input.score) || input.score < 1 || input.score > 5) throw new PortalError(400, 'score 需 1~5');
  if (surveys.some((s) => s.patientId === input.patientId && s.visitId === input.visitId)) {
    throw new PortalError(409, '该就诊已提交满意度，重复提交');
  }
  const s: SatisfactionSurvey = { surveyId: gen('SV'), patientId: input.patientId, visitId: input.visitId, doctorId: input.doctorId, score: input.score, comment: input.comment, submittedAt: new Date().toISOString() };
  surveys.push(s);
  if (input.score <= 3) {
    adminNotifs.push({ notifId: gen('AN'), level: 'warning', message: `低分满意度：patient=${input.patientId} visit=${input.visitId} doctor=${input.doctorId} score=${input.score} comment=${input.comment ?? ''}`, createdAt: new Date().toISOString() });
  }
  return s;
}

// ---------- Reminders ----------
export function listReminders(patientId: string): Reminder[] {
  return reminders.filter((r) => r.patientId === patientId).sort((a, b) => (a.triggerAt < b.triggerAt ? 1 : -1));
}

export function markReminderRead(patientId: string, reminderId: string): Reminder {
  const r = reminders.find((x) => x.reminderId === reminderId);
  if (!r) throw new PortalError(404, `提醒不存在：${reminderId}`);
  if (r.patientId !== patientId) throw new PortalError(403, '只能读自己的提醒');
  r.status = 'read';
  return r;
}

// ---------- Payments ----------
export function listPayments(patientId: string): PaymentRecord[] {
  return payments.filter((p) => p.patientId === patientId).sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));
}

// ---------- Admin notifs ----------
export function listAdminNotifs(): AdminNotification[] { return [...adminNotifs]; }

// ---------- Seed (DEMO_MODE) ----------
export function seed(patientId: string, input: {
  reports?: Array<Omit<Report, 'reportId' | 'patientId' | 'readAt'>>;
  payments?: Array<Omit<PaymentRecord, 'paymentId' | 'patientId'>>;
  reminders?: Array<Omit<Reminder, 'reminderId' | 'patientId' | 'status'>>;
}): { reports: number; payments: number; reminders: number } {
  let r = 0, p = 0, m = 0;
  for (const x of input.reports ?? []) { reports.push({ ...x, reportId: gen('RP'), patientId, readAt: null }); r++; }
  for (const x of input.payments ?? []) { payments.push({ ...x, paymentId: gen('PY'), patientId }); p++; }
  for (const x of input.reminders ?? []) {
    pick(x.channel, CHANNELS, 'channel');
    reminders.push({ ...x, reminderId: gen('RM'), patientId, status: 'sent' as const }); m++;
  }
  return { reports: r, payments: p, reminders: m };
}

export function __resetStore(): void {
  reports.length = 0; bookings.length = 0; surveys.length = 0; reminders.length = 0; payments.length = 0; adminNotifs.length = 0; seq = 0;
}
