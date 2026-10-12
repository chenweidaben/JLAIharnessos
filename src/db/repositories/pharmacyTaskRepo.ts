/**
 * 健澜科技 jlmedaios - 药房配药任务 repo（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface PharmacyTask {
  id: string; prescriptionId: string; patientId: string; status: string;
  assignedPharmacist: string | null; completedAt: string | null; createdAt: string;
}

function map(r: Record<string, unknown>): PharmacyTask {
  return {
    id: String(r.id), prescriptionId: String(r.prescription_id), patientId: String(r.patient_id),
    status: String(r.status),
    assignedPharmacist: r.assigned_pharmacist == null ? null : String(r.assigned_pharmacist),
    completedAt: r.completed_at == null ? null : String(r.completed_at),
    createdAt: String(r.created_at),
  };
}

/** 建任务（幂等 UNIQUE）。 */
export async function createTask(
  input: { prescriptionId: string; patientId: string },
  tx: DbExecutor = db,
): Promise<PharmacyTask> {
  const rows = await tx`
    INSERT INTO clinical.pharmacy_dispense_tasks (prescription_id, patient_id)
    VALUES (${input.prescriptionId}, ${input.patientId})
    ON CONFLICT (prescription_id) DO UPDATE SET prescription_id = EXCLUDED.prescription_id
    RETURNING id, prescription_id, patient_id, status, assigned_pharmacist, completed_at, created_at`;
  return map(rows[0] as Record<string, unknown>);
}

export async function listPending(): Promise<PharmacyTask[]> {
  const rows = await db`
    SELECT id, prescription_id, patient_id, status, assigned_pharmacist, completed_at, created_at
    FROM clinical.pharmacy_dispense_tasks WHERE status='pending' ORDER BY created_at ASC LIMIT 200`;
  return rows.map((r) => map(r as Record<string, unknown>));
}

export async function getTaskById(id: string, tx: DbExecutor = db): Promise<PharmacyTask | null> {
  const rows = await tx`
    SELECT id, prescription_id, patient_id, status, assigned_pharmacist, completed_at, created_at
    FROM clinical.pharmacy_dispense_tasks WHERE id=${id}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** CAS pending → completed。 */
export async function completeTask(id: string, pharmacistId: string, tx: DbExecutor = db): Promise<PharmacyTask | null> {
  const rows = await tx`
    UPDATE clinical.pharmacy_dispense_tasks
    SET status='completed', assigned_pharmacist=${pharmacistId}, completed_at=now()
    WHERE id=${id} AND status='pending'
    RETURNING id, prescription_id, patient_id, status, assigned_pharmacist, completed_at, created_at`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
