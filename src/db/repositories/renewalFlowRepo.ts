/**
 * 健澜科技 jlmedaios - 续方流转 repo（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

const db = getDb();

export interface RenewalRow {
  id: string; rxNo: string; sessionId: string; patientId: string; prescriberId: string;
  status: string; isRenewal: boolean; priorPrescriptionId: string | null; totalFee: string | null;
  createdAt: string;
}

function map(r: Record<string, unknown>): RenewalRow {
  return {
    id: String(r.id), rxNo: String(r.rx_no), sessionId: String(r.session_id),
    patientId: String(r.patient_id), prescriberId: String(r.prescriber_id),
    status: String(r.status), isRenewal: Boolean(r.is_renewal),
    priorPrescriptionId: r.prior_prescription_id == null ? null : String(r.prior_prescription_id),
    totalFee: r.total_fee == null ? null : String(r.total_fee),
    createdAt: String(r.created_at),
  };
}

export async function createRenewalPrescription(
  input: { sessionId: string; patientId: string; accountId: string; profileId: string; prescriberId: string; department?: string | null; rxNo: string; idempotencyKey: string; priorRxId?: string | null; totalFee?: number | null },
  tx: DbExecutor = db,
): Promise<RenewalRow> {
  const rows = await tx`
    INSERT INTO clinical.internet_prescriptions
      (rx_no, session_id, account_id, profile_id, patient_id, prescriber_id, department, status, is_renewal, prior_prescription_id, total_fee, idempotency_key)
    VALUES (${input.rxNo}, ${input.sessionId}, ${input.accountId}, ${input.profileId}, ${input.patientId}, ${input.prescriberId}, ${input.department ?? null}, 'approved', true, ${input.priorRxId ?? null}, ${input.totalFee ?? 0}, ${input.idempotencyKey})
    RETURNING id, rx_no, session_id, patient_id, prescriber_id, status, is_renewal, prior_prescription_id, total_fee, created_at`;
  return map(rows[0] as Record<string, unknown>);
}

export async function getRenewalById(id: string, tx: DbExecutor = db): Promise<RenewalRow | null> {
  const rows = await tx`
    SELECT id, rx_no, session_id, patient_id, prescriber_id, status, is_renewal, prior_prescription_id, total_fee, created_at
    FROM clinical.internet_prescriptions WHERE id=${id}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

export async function listByPatient(patientId: string): Promise<RenewalRow[]> {
  const rows = await db`
    SELECT id, rx_no, session_id, patient_id, prescriber_id, status, is_renewal, prior_prescription_id, total_fee, created_at
    FROM clinical.internet_prescriptions WHERE patient_id=${patientId} AND is_renewal = true ORDER BY created_at DESC LIMIT 100`;
  return rows.map((r) => map(r as Record<string, unknown>));
}

/** CAS：expected → next。0 行即非法跳转。 */
export async function transitionStatus(id: string, expected: string, next: string, tx: DbExecutor = db): Promise<RenewalRow | null> {
  const rows = await tx`
    UPDATE clinical.internet_prescriptions SET status=${next}
    WHERE id=${id} AND status=${expected}
    RETURNING id, rx_no, session_id, patient_id, prescriber_id, status, is_renewal, prior_prescription_id, total_fee, created_at`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
