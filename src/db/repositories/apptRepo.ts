/**
 * 健澜科技 jlmedaios - 预约随访 Repository（M3-I）
 *
 * clinical.appointments / follow_up_plans / follow_up_records 读写。
 * 并发：appointment_no 唯一幂等；状态推进 FOR UPDATE 行锁 + 白名单。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type ApptStatus = 'scheduled' | 'confirmed' | 'completed' | 'absent' | 'cancelled';

export interface Appointment {
  id: string;
  appointmentNo: string;
  patientId: string;
  visitId: string | null;
  scheduledAt: string;
  department: string;
  purpose: string;
  status: ApptStatus;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpPlan {
  id: string;
  planNo: string;
  patientId: string;
  appointmentId: string | null;
  scheduledDate: string;
  content: string;
  status: 'pending' | 'completed' | 'missed';
  assignedTo: string | null;
  createdAt: string;
}

const ACOLS = `
  id, appointment_no, patient_id, visit_id, scheduled_at, department, purpose,
  status, cancel_reason, created_at, updated_at
`;
const PCOLS = `
  id, plan_no, patient_id, appointment_id, scheduled_date, content, status,
  assigned_to, created_at
`;

function mapA(r: Record<string, unknown>): Appointment {
  return {
    id: String(r.id),
    appointmentNo: String(r.appointment_no),
    patientId: String(r.patient_id),
    visitId: r.visit_id ? String(r.visit_id) : null,
    scheduledAt: String(r.scheduled_at),
    department: String(r.department),
    purpose: String(r.purpose),
    status: r.status as ApptStatus,
    cancelReason: r.cancel_reason ? String(r.cancel_reason) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
function mapP(r: Record<string, unknown>): FollowUpPlan {
  return {
    id: String(r.id),
    planNo: String(r.plan_no),
    patientId: String(r.patient_id),
    appointmentId: r.appointment_id ? String(r.appointment_id) : null,
    scheduledDate: String(r.scheduled_date),
    content: String(r.content),
    status: r.status as FollowUpPlan['status'],
    assignedTo: r.assigned_to ? String(r.assigned_to) : null,
    createdAt: String(r.created_at),
  };
}

export async function createAppointment(
  input: { appointmentNo: string; patientId: string; scheduledAt: string; department?: string; purpose: string; createdBy: string },
  tx: DbExecutor,
): Promise<{ appt: Appointment; created: boolean }> {
  const ex = await tx`SELECT ${tx.unsafe(ACOLS)} FROM clinical.appointments WHERE appointment_no = ${input.appointmentNo}`;
  if (ex.length > 0) return { appt: mapA(ex[0] as Record<string, unknown>), created: false };
  const rows = await tx`
    INSERT INTO clinical.appointments (appointment_no, patient_id, scheduled_at, department, purpose, created_by)
    VALUES (${input.appointmentNo}, ${input.patientId}, ${input.scheduledAt}, ${input.department ?? '门诊'}, ${input.purpose}, ${input.createdBy})
    RETURNING ${tx.unsafe(ACOLS)}
  `;
  return { appt: mapA(rows[0] as Record<string, unknown>), created: true };
}

export async function getApptById(id: string, sql?: DbExecutor): Promise<Appointment | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ACOLS)} FROM clinical.appointments WHERE id = ${id}`;
  return rows.length > 0 ? mapA(rows[0] as Record<string, unknown>) : null;
}

export async function lockAppt(id: string, tx: DbExecutor): Promise<Appointment | null> {
  const rows = await tx`SELECT ${tx.unsafe(ACOLS)} FROM clinical.appointments WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapA(rows[0] as Record<string, unknown>) : null;
}

export async function listAppts(sql?: DbExecutor): Promise<Appointment[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ACOLS)} FROM clinical.appointments ORDER BY scheduled_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapA);
}

export async function patchAppt(id: string, p: Record<string, unknown>, tx: DbExecutor): Promise<Appointment> {
  const keys = Object.keys(p);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const rows = await tx.unsafe(
    `UPDATE clinical.appointments SET ${sets.join(', ')} WHERE id = $1 RETURNING ${ACOLS}`,
    [id, ...keys.map((k) => p[k])],
  );
  return mapA(rows[0] as Record<string, unknown>);
}

export async function createPlan(
  input: { planNo: string; patientId: string; appointmentId?: string | null; scheduledDate: string; content: string; createdBy: string },
  tx: DbExecutor,
): Promise<FollowUpPlan> {
  const rows = await tx`
    INSERT INTO clinical.follow_up_plans (plan_no, patient_id, appointment_id, scheduled_date, content, created_by)
    VALUES (${input.planNo}, ${input.patientId}, ${input.appointmentId ?? null}, ${input.scheduledDate}, ${input.content}, ${input.createdBy})
    RETURNING ${tx.unsafe(PCOLS)}
  `;
  return mapP(rows[0] as Record<string, unknown>);
}

export async function getPlanById(id: string, sql?: DbExecutor): Promise<FollowUpPlan | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(PCOLS)} FROM clinical.follow_up_plans WHERE id = ${id}`;
  return rows.length > 0 ? mapP(rows[0] as Record<string, unknown>) : null;
}

export async function lockPlan(id: string, tx: DbExecutor): Promise<FollowUpPlan | null> {
  const rows = await tx`SELECT ${tx.unsafe(PCOLS)} FROM clinical.follow_up_plans WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapP(rows[0] as Record<string, unknown>) : null;
}

export async function listPlans(sql?: DbExecutor): Promise<FollowUpPlan[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(PCOLS)} FROM clinical.follow_up_plans ORDER BY scheduled_date ASC`;
  return (rows as Record<string, unknown>[]).map(mapP);
}

export async function recordFollowUp(
  planId: string,
  outcome: string,
  note: string | null,
  recordedBy: string,
  tx: DbExecutor,
): Promise<void> {
  await tx`
    INSERT INTO clinical.follow_up_records (plan_id, outcome, note, recorded_by)
    VALUES (${planId}, ${outcome}, ${note}, ${recordedBy})
  `;
  await tx`UPDATE clinical.follow_up_plans SET status = 'completed' WHERE id = ${planId}`;
}

export async function countAppts(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ n: number }[]>`SELECT count(*) AS n FROM clinical.appointments`;
  return Number(rows[0]?.n ?? 0);
}
