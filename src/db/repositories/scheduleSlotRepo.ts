/**
 * 健澜科技 jlmedaios - 号源排班 Repository（M19-A）
 *
 * doctor_schedules + appointment_slots。约号走 row lock UPDATE 防超卖。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  department: string | null;
  workDate: string;
  note: string | null;
  createdAt: string;
}

export interface AppointmentSlot {
  id: string;
  scheduleId: string;
  slotStart: string;
  slotEnd: string;
  totalQuota: number;
  bookedCount: number;
  status: 'open' | 'closed';
}

export async function createSchedule(input: { doctorId: string; department?: string | null; workDate: string; note?: string | null; createdBy?: string | null }, sql?: DbExecutor): Promise<DoctorSchedule> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.doctor_schedules (doctor_id, department, work_date, note, created_by)
    VALUES (${input.doctorId}, ${input.department ?? null}, ${input.workDate}, ${input.note ?? null}, ${input.createdBy ?? null})
    RETURNING id, doctor_id, department, work_date, note, created_at`;
  const r = rows[0] as Record<string, unknown>;
  return { id: String(r.id), doctorId: String(r.doctor_id), department: r.department ? String(r.department) : null, workDate: String(r.work_date), note: r.note ? String(r.note) : null, createdAt: String(r.created_at) };
}

export async function addSlot(scheduleId: string, slotStart: string, slotEnd: string, totalQuota: number, sql?: DbExecutor): Promise<AppointmentSlot> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.appointment_slots (schedule_id, slot_start, slot_end, total_quota)
    VALUES (${scheduleId}, ${slotStart}, ${slotEnd}, ${totalQuota})
    RETURNING id, schedule_id, slot_start, slot_end, total_quota, booked_count, status`;
  return mapSlot(rows[0] as Record<string, unknown>);
}

function mapRowToSlot(r: Record<string, unknown>): AppointmentSlot {
  return {
    id: String(r.id),
    scheduleId: String(r.schedule_id),
    slotStart: String(r.slot_start),
    slotEnd: String(r.slot_end),
    totalQuota: Number(r.total_quota),
    bookedCount: Number(r.booked_count),
    status: r.status as 'open' | 'closed',
  };
}

function mapSlot(r: Record<string, unknown>): AppointmentSlot {
  return mapRowToSlot(r);
}

/** 按科室/日期列可约时段。 */
export async function listOpenSlots(department?: string, workDate?: string): Promise<AppointmentSlot[]> {
  const db = getDb();
  let sql = db`SELECT s.id, s.schedule_id, s.slot_start, s.slot_end, s.total_quota, s.booked_count, s.status
    FROM clinical.appointment_slots s JOIN clinical.doctor_schedules d ON d.id = s.schedule_id
    WHERE s.status = 'open' AND s.slot_start > now()`;
  if (department) sql = db`${sql} AND d.department = ${department}`;
  if (workDate) sql = db`${sql} AND d.work_date = ${workDate}`;
  sql = db`${sql} ORDER BY s.slot_start ASC`;
  const rows = await sql;
  return (rows as Record<string, unknown>[]).map(mapRowToSlot);
}

/**
 * 占号 + 写 appointment：row lock 防超卖；0 行即号满/已关闭。
 * 返回 { slot, appointment }。
 */
export async function bookSlotWithAppointment(
  slotId: string,
  booking: { patientId: string; department?: string | null; purpose?: string | null },
  appointmentNo: string,
  tx: DbExecutor,
): Promise<{ slot: AppointmentSlot; appointmentNo: string } | null> {
  const rows = await tx`
    UPDATE clinical.appointment_slots
    SET booked_count = booked_count + 1
    WHERE id = ${slotId} AND status = 'open' AND booked_count < total_quota
    RETURNING id, schedule_id, slot_start, slot_end, total_quota, booked_count, status`;
  if (rows.length === 0) return null;
  const slot = mapRowToSlot(rows[0] as Record<string, unknown>);
  await tx`
    INSERT INTO clinical.appointments (appointment_no, patient_id, scheduled_at, department, purpose, status, slot_id)
    VALUES (${appointmentNo}, ${booking.patientId}, ${slot.slotStart}, ${booking.department ?? 'TBD'}, ${booking.purpose ?? 'booked via slot'}, 'scheduled', ${slotId})`;
  return { slot, appointmentNo };
}

/** 退号：appointment CAS scheduled→cancelled，再 booked_count-1。 */
export async function cancelBookingWithAppointment(slotId: string, tx: DbExecutor): Promise<AppointmentSlot | null> {
  const cancelled = await tx`
    UPDATE clinical.appointments SET status = 'cancelled'
    WHERE slot_id = ${slotId} AND status = 'scheduled'`;
  void cancelled;
  const rows = await tx`
    UPDATE clinical.appointment_slots
    SET booked_count = booked_count - 1
    WHERE id = ${slotId} AND booked_count > 0
    RETURNING id, schedule_id, slot_start, slot_end, total_quota, booked_count, status`;
  return rows.length > 0 ? mapRowToSlot(rows[0] as Record<string, unknown>) : null;
}

export async function getSlotById(slotId: string, sql?: DbExecutor): Promise<AppointmentSlot | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT id, schedule_id, slot_start, slot_end, total_quota, booked_count, status FROM clinical.appointment_slots WHERE id = ${slotId}`;
  return rows.length > 0 ? mapRowToSlot(rows[0] as Record<string, unknown>) : null;
}
