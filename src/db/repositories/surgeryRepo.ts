/**
 * 健澜科技 jlmedaios - 手术麻醉 Repository（M3-H）
 *
 * clinical.surgery_requests / anesthesia_records / intraop_events / pacu_assessments 读写。
 *
 * 并发与一致性：
 *  - 申请号 request_no 唯一，重复申请幂等返回既有；
 *  - 状态推进：FOR UPDATE 行锁 + 状态白名单（应用层二次校验非法转换）；
 *  - 双签：surgeon_signed_at / anesthetist_signed_at 同时存在才允许 discharged。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type SurgeryStatus =
  | 'requested' | 'scheduled' | 'prechecked' | 'induction'
  | 'maintenance' | 'recovery' | 'pacu' | 'discharged' | 'cancelled';

export interface SurgeryRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  surgeryType: string;
  plannedProcedure: string;
  diagnosis: string | null;
  plannedDate: string | null;
  department: string;
  surgeonId: string | null;
  anesthetistId: string | null;
  anesthesiaMethod: string | null;
  status: SurgeryStatus;
  precheck: Record<string, unknown>;
  precheckedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  surgeonSignedAt: string | null;
  anesthetistSignedAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const COLS = `
  id, request_no, visit_id, patient_id, surgery_type, planned_procedure, diagnosis,
  planned_date, department, surgeon_id, anesthetist_id, anesthesia_method, status,
  precheck, prechecked_at, started_at, ended_at, surgeon_signed_at, anesthetist_signed_at,
  cancel_reason, created_at, updated_at
`;

function map(row: Record<string, unknown>): SurgeryRequest {
  return {
    id: String(row.id),
    requestNo: String(row.request_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    surgeryType: String(row.surgery_type),
    plannedProcedure: String(row.planned_procedure),
    diagnosis: row.diagnosis ? String(row.diagnosis) : null,
    plannedDate: row.planned_date ? String(row.planned_date) : null,
    department: String(row.department),
    surgeonId: row.surgeon_id ? String(row.surgeon_id) : null,
    anesthetistId: row.anesthetist_id ? String(row.anesthetist_id) : null,
    anesthesiaMethod: row.anesthesia_method ? String(row.anesthesia_method) : null,
    status: row.status as SurgeryStatus,
    precheck: (row.precheck as Record<string, unknown>) ?? {},
    precheckedAt: row.prechecked_at ? String(row.prechecked_at) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    endedAt: row.ended_at ? String(row.ended_at) : null,
    surgeonSignedAt: row.surgeon_signed_at ? String(row.surgeon_signed_at) : null,
    anesthetistSignedAt: row.anesthetist_signed_at ? String(row.anesthetist_signed_at) : null,
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
    surgeryType: string;
    plannedProcedure: string;
    diagnosis?: string | null;
    plannedDate?: string | null;
    department?: string;
    createdBy: string;
  },
  tx: DbExecutor,
): Promise<{ req: SurgeryRequest; created: boolean }> {
  const existing = await tx`SELECT ${tx.unsafe(COLS)} FROM clinical.surgery_requests WHERE request_no = ${input.requestNo}`;
  if (existing.length > 0) return { req: map(existing[0] as Record<string, unknown>), created: false };
  const rows = await tx`
    INSERT INTO clinical.surgery_requests (
      request_no, visit_id, patient_id, surgery_type, planned_procedure, diagnosis,
      planned_date, department, created_by
    ) VALUES (
      ${input.requestNo}, ${input.visitId}, ${input.patientId}, ${input.surgeryType},
      ${input.plannedProcedure}, ${input.diagnosis ?? null}, ${input.plannedDate ?? null},
      ${input.department ?? '外科'}, ${input.createdBy}
    )
    RETURNING ${tx.unsafe(COLS)}
  `;
  return { req: map(rows[0] as Record<string, unknown>), created: true };
}

export async function getById(id: string, sql?: DbExecutor): Promise<SurgeryRequest | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.surgery_requests WHERE id = ${id}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

/** FOR UPDATE 取行，供状态机推进。 */
export async function lockById(id: string, tx: DbExecutor): Promise<SurgeryRequest | null> {
  const rows = await tx`SELECT ${tx.unsafe(COLS)} FROM clinical.surgery_requests WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

export async function listRequests(sql?: DbExecutor): Promise<SurgeryRequest[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.surgery_requests ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}

type Patch = Record<string, unknown>;

export async function patch(id: string, p: Patch, tx: DbExecutor): Promise<SurgeryRequest> {
  const keys = Object.keys(p);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  const rows = await tx.unsafe(
    `UPDATE clinical.surgery_requests SET ${sets.join(', ')} WHERE id = $1 RETURNING ${COLS}`,
    [id, ...keys.map((k) => p[k])],
  );
  return map(rows[0] as Record<string, unknown>);
}

export async function appendEvent(
  surgeryId: string,
  eventType: string,
  payload: Record<string, unknown>,
  tx: DbExecutor,
): Promise<void> {
  await tx`
    INSERT INTO clinical.intraop_events (surgery_id, event_type, payload)
    VALUES (${surgeryId}, ${eventType}, ${payload}::jsonb)
  `;
}

export async function listEvents(surgeryId: string, sql?: DbExecutor) {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id, surgery_id, event_type, occurred_at, payload
    FROM clinical.intraop_events WHERE surgery_id = ${surgeryId} ORDER BY occurred_at ASC
  `;
  return rows;
}

export async function upsertAnesthesia(
  surgeryId: string,
  notes: { induction?: string; maintenance?: string; recovery?: string },
  tx?: DbExecutor,
): Promise<void> {
  const db = tx ?? getDb();
  await db`
    INSERT INTO clinical.anesthesia_records (surgery_id, induction_notes, maintenance_notes, recovery_notes)
    VALUES (${surgeryId}, ${notes.induction ?? null}, ${notes.maintenance ?? null}, ${notes.recovery ?? null})
    ON CONFLICT (surgery_id) DO UPDATE SET
      induction_notes = COALESCE(EXCLUDED.induction_notes, clinical.anesthesia_records.induction_notes),
      maintenance_notes = COALESCE(EXCLUDED.maintenance_notes, clinical.anesthesia_records.maintenance_notes),
      recovery_notes = COALESCE(EXCLUDED.recovery_notes, clinical.anesthesia_records.recovery_notes)
  `;
}

export async function addPacu(
  surgeryId: string,
  aldrete: number,
  assessedBy: string,
  canDischarge: boolean,
  note: string | null,
  tx: DbExecutor,
): Promise<void> {
  await tx`
    INSERT INTO clinical.pacu_assessments (surgery_id, aldrete_total, assessed_by, can_discharge, note)
    VALUES (${surgeryId}, ${aldrete}, ${assessedBy}, ${canDischarge}, ${note})
  `;
}

export async function countRequests(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ n: number }[]>`SELECT count(*) AS n FROM clinical.surgery_requests`;
  return Number(rows[0]?.n ?? 0);
}
