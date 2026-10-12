/**
 * 健澜科技 jlmedaios - 患者通知 repo（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface PatientNotification {
  id: string; patientId: string; notifType: string; title: string; body: string;
  refType: string | null; refId: string | null; readAt: string | null; createdAt: string;
}

function map(r: Record<string, unknown>): PatientNotification {
  return {
    id: String(r.id), patientId: String(r.patient_id), notifType: String(r.notif_type),
    title: String(r.title), body: String(r.body),
    refType: r.ref_type == null ? null : String(r.ref_type),
    refId: r.ref_id == null ? null : String(r.ref_id),
    readAt: r.read_at == null ? null : String(r.read_at),
    createdAt: String(r.created_at),
  };
}

export async function createNotification(
  input: { patientId: string; notifType: string; title: string; body: string; refType?: string | null; refId?: string | null },
  tx: DbExecutor = db,
): Promise<PatientNotification> {
  const rows = await tx`
    INSERT INTO clinical.patient_notifications (patient_id, notif_type, title, body, ref_type, ref_id)
    VALUES (${input.patientId}, ${input.notifType}, ${input.title}, ${input.body}, ${input.refType ?? null}, ${input.refId ?? null})
    RETURNING id, patient_id, notif_type, title, body, ref_type, ref_id, read_at, created_at`;
  return map(rows[0] as Record<string, unknown>);
}

export async function listByPatient(patientId: string): Promise<PatientNotification[]> {
  const rows = await db`
    SELECT id, patient_id, notif_type, title, body, ref_type, ref_id, read_at, created_at
    FROM clinical.patient_notifications WHERE patient_id = ${patientId} ORDER BY created_at DESC LIMIT 200`;
  return rows.map((r) => map(r as Record<string, unknown>));
}

export async function unreadCount(patientId: string): Promise<number> {
  const rows = await db`SELECT count(*)::int AS c FROM clinical.patient_notifications WHERE patient_id=${patientId} AND read_at IS NULL`;
  return Number((rows[0] as { c: number }).c);
}

export async function markRead(id: string, tx: DbExecutor = db): Promise<PatientNotification | null> {
  const rows = await tx`
    UPDATE clinical.patient_notifications SET read_at = now()
    WHERE id = ${id} AND read_at IS NULL RETURNING id, patient_id, notif_type, title, body, ref_type, ref_id, read_at, created_at`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

export async function markAllRead(patientId: string, tx: DbExecutor = db): Promise<void> {
  await tx`UPDATE clinical.patient_notifications SET read_at = now() WHERE patient_id=${patientId} AND read_at IS NULL`;
}
