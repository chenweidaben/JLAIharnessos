/**
 * 健澜科技 jlmedaios - 号源排班聚合器（M19-A）
 *
 * 建排班（schedule:manage）/ 列可约时段 / 占号（schedule:book，超号 409）/ 退号。
 * recordChainAudit 留痕。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { withTx } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  addSlot,
  bookSlotWithAppointment,
  cancelBookingWithAppointment,
  createSchedule,
  getSlotById,
  listOpenSlots,
} from '../../db/repositories/scheduleSlotRepo.js';
import { isAvailable, remainingQuota } from '../../medical-tools/internet/slotQuota.js';
import { makeAppointmentId } from '../../medical-tools/internet/appointmentNo.js';

export class ScheduleError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ScheduleError';
  }
}
const badRequest = (m: string) => new ScheduleError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ScheduleError(404, 'NOT_FOUND', m);
const conflict = (m: string) => new ScheduleError(409, 'SLOT_FULL', m);
const forbidden = (m: string) => new ScheduleError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(id: string, label: string): void {
  if (!id || !UUID_RE.test(id.trim())) throw badRequest(`${label} 须为 UUID`);
}

/** 医生/管理员建排班 + 批量时段。 */
export async function createScheduleView(
  auth: AuthView,
  input: { doctorId: string; department?: string | null; workDate: string; note?: string | null; slots: { slotStart: string; slotEnd: string; totalQuota: number }[] },
) {
  assertPermission(auth, 'schedule:manage');
  assertUuid(input.doctorId, '医生');
  if (!input.workDate) throw badRequest('work_date 必填');
  if (!input.slots.length) throw badRequest('至少一个时段');
  return withTx(async (tx) => {
    const sched = await createSchedule({ doctorId: input.doctorId, department: input.department ?? null, workDate: input.workDate, note: input.note ?? null, createdBy: auth.id }, tx);
    const slots = [];
    for (const sl of input.slots) {
      slots.push(await addSlot(sched.id, sl.slotStart, sl.slotEnd, sl.totalQuota, tx));
    }
    await recordChainAudit(
      { actorId: auth.id, action: 'schedule.create', resourceType: 'doctor_schedule', resourceId: sched.id, result: 'success', riskLevel: 'low', detail: { slotCount: slots.length } },
      tx,
    );
    return { schedule: sched, slots };
  });
}

/** 列可约时段。 */
export async function listSlotsView(auth: AuthView, department?: string, workDate?: string) {
  assertPermission(auth, 'schedule:book');
  const rows = await listOpenSlots(department, workDate);
  return rows.map((s) => ({ ...s, remaining: remainingQuota(s), available: isAvailable(s) }));
}

/** 占号：row lock；号满/关闭 → 409。同时写 appointment。 */
export async function bookSlotView(auth: AuthView, slotId: string, booking: { patientId: string; department?: string | null; purpose?: string | null }) {
  assertPermission(auth, 'schedule:book');
  assertUuid(slotId, '时段');
  assertUuid(booking.patientId, '患者');
  return withTx(async (tx) => {
    const before = await getSlotById(slotId, tx);
    if (!before) throw notFound('时段不存在');
    const appointmentNo = makeAppointmentId();
    const booked = await bookSlotWithAppointment(slotId, booking, appointmentNo, tx);
    if (!booked) throw conflict('号源已满或时段已关闭');
    await recordChainAudit(
      { actorId: auth.id, action: 'schedule.book', resourceType: 'appointment_slot', resourceId: slotId, result: 'success', riskLevel: 'low', detail: { appointmentNo } },
      tx,
    );
    return booked;
  });
}

/** 退号：appointment CAS cancelled + booked_count-1。 */
export async function cancelBookingView(auth: AuthView, slotId: string) {
  assertPermission(auth, 'schedule:book');
  assertUuid(slotId, '时段');
  return withTx(async (tx) => {
    const c = await cancelBookingWithAppointment(slotId, tx);
    if (!c) throw conflict('无可退号');
    await recordChainAudit(
      { actorId: auth.id, action: 'schedule.cancel', resourceType: 'appointment_slot', resourceId: slotId, result: 'success', riskLevel: 'low', detail: {} },
      tx,
    );
    return c;
  });
}
