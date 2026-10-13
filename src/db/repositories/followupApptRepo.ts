/**
 * 健澜科技 jlmedaios - 复诊号源预约 repo（M62-A）
 * 复用 M19 doctor_schedules + appointment_slots。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';
import type { SlotOption } from '../../medical-tools/nursing/followupAppt.js';

export interface FollowupAppt {
  id: string;
  dischargePlanId: string;
  scheduleId: string;
  appointmentDate: string;
  department: string;
  status: string;
  bookedBy: string;
  createdAt: string;
}

const COLS = `id, discharge_plan_id, schedule_id, appointment_date, department, status, booked_by, created_at`;

function map(r: Record<string, unknown>): FollowupAppt {
  return {
    id: String(r.id),
    dischargePlanId: String(r.discharge_plan_id),
    scheduleId: String(r.schedule_id),
    appointmentDate: String(r.appointment_date),
    department: String(r.department),
    status: String(r.status),
    bookedBy: String(r.booked_by),
    createdAt: String(r.created_at),
  };
}

/** 查某科室某日期起有余量的号源候选。 */
export async function listAvailableSlots(
  department: string, fromDate: string, tx: DbExecutor = getDb(),
): Promise<SlotOption[]> {
  const rows = await tx`
    SELECT ds.id AS schedule_id, ds.work_date AS appointment_date, ds.department,
           (s.total_quota - s.booked_count)::int AS remaining
    FROM clinical.appointment_slots s
    JOIN clinical.doctor_schedules ds ON ds.id = s.schedule_id
    WHERE s.status='open' AND s.booked_count < s.total_quota
      AND ds.department = ${department} AND ds.work_date >= ${fromDate}
    ORDER BY ds.work_date ASC LIMIT 20`;
  return (rows as Record<string, unknown>[]).map((r) => ({
    scheduleId: String(r.schedule_id),
    appointmentDate: String(r.appointment_date),
    department: String(r.department),
    remaining: Number(r.remaining),
  }));
}

export async function getByPlanId(dischargePlanId: string, tx: DbExecutor = getDb()): Promise<FollowupAppt | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.followup_appointments
    WHERE discharge_plan_id=${dischargePlanId} LIMIT 1`;
  return rows.length === 0 ? null : map(rows[0] as Record<string, unknown>);
}

/** 占用号源：插预约 + 该 schedule 任意一个 open slot booked_count+1（余量保证>0）。 */
export async function bookFollowup(
  input: { dischargePlanId: string; scheduleId: string; appointmentDate: string; department: string; bookedBy: string },
  tx: DbExecutor = getDb(),
): Promise<FollowupAppt> {
  const bump = await tx`
    UPDATE clinical.appointment_slots SET booked_count = booked_count + 1
    WHERE schedule_id=${input.scheduleId} AND status='open' AND booked_count < total_quota
    RETURNING id`;
  if (bump.length === 0) throw new Error('号源已约满或不可约');
  const rows = await tx`
    INSERT INTO clinical.followup_appointments
      (discharge_plan_id, schedule_id, appointment_date, department, booked_by)
    VALUES
      (${input.dischargePlanId}, ${input.scheduleId}, ${input.appointmentDate}, ${input.department}, ${input.bookedBy})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function cancel(id: string, tx: DbExecutor = getDb()): Promise<FollowupAppt> {
  const rows = await tx`
    UPDATE clinical.followup_appointments SET status='cancelled' WHERE id=${id} AND status='booked'
    RETURNING ${tx.unsafe(COLS)}`;
  if (rows.length === 0) throw new Error('复诊预约不存在或已取消');
  return map(rows[0] as Record<string, unknown>);
}

export async function listByVisit(visitId: string, tx: DbExecutor = getDb()): Promise<FollowupAppt[]> {
  const rows = await tx`
    SELECT fa.${tx.unsafe('id, discharge_plan_id, schedule_id, appointment_date, department, status, booked_by, created_at')}
    FROM clinical.followup_appointments fa
    JOIN clinical.discharge_plans dp ON dp.id = fa.discharge_plan_id
    WHERE dp.visit_id=${visitId} ORDER BY fa.created_at DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}
