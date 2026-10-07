/**
 * 健澜科技 jlmedaios - 输血管理 Repository（M10-A）
 *
 * clinical.blood_transfusion_requests / blood_stock / blood_transfusions /
 * blood_transfusion_reactions 读写。
 *
 * 并发与一致性：
 *  - 申请号 request_no 唯一，重复申请幂等返回既有；
 *  - 状态推进：FOR UPDATE 行锁 + 应用层状态白名单（非法转换 409）；
 *  - 发血扣库存：事务内 SELECT ... FOR UPDATE 锁定库存行，不足 409；
 *  - 输注双人核对：transfused_by 与 co_sign_by 互异（应用层强制）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type TransfusionStatus =
  | 'requested' | 'crossmatched' | 'dispensed' | 'transfusing'
  | 'completed' | 'cancelled';

export interface TransfusionRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  department: string;
  applicantId: string;
  indication: string;
  indicationMeta: Record<string, unknown>;
  bloodType: string;
  component: string;
  unitCount: number;
  urgency: string;
  status: TransfusionStatus;
  rejectReason: string | null;
  crossmatchResult: string | null;
  crossmatchNote: string | null;
  crossmatchedBy: string | null;
  crossmatchedAt: string | null;
  batchNo: string | null;
  dispensedBy: string | null;
  dispensedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BloodStock {
  id: string;
  bloodType: string;
  component: string;
  batchNo: string;
  units: number;
  expiryDate: string | null;
}

const COLS = `
  id, request_no, visit_id, patient_id, department, applicant_id, indication,
  indication_meta, blood_type, component, unit_count, urgency, status,
  reject_reason, crossmatch_result, crossmatch_note, crossmatched_by, crossmatched_at,
  batch_no, dispensed_by, dispensed_at, cancelled_by, cancelled_at, cancel_reason,
  created_at, updated_at
`;

function mapRow(row: Record<string, unknown>): TransfusionRequest {
  return {
    id: String(row.id),
    requestNo: String(row.request_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    department: String(row.department),
    applicantId: String(row.applicant_id),
    indication: String(row.indication),
    indicationMeta: (row.indication_meta ?? {}) as Record<string, unknown>,
    bloodType: String(row.blood_type),
    component: String(row.component),
    unitCount: Number(row.unit_count),
    urgency: String(row.urgency),
    status: row.status as TransfusionStatus,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    crossmatchResult: row.crossmatch_result ? String(row.crossmatch_result) : null,
    crossmatchNote: row.crossmatch_note ? String(row.crossmatch_note) : null,
    crossmatchedBy: row.crossmatched_by ? String(row.crossmatched_by) : null,
    crossmatchedAt: row.crossmatched_at ? String(row.crossmatched_at) : null,
    batchNo: row.batch_no ? String(row.batch_no) : null,
    dispensedBy: row.dispensed_by ? String(row.dispensed_by) : null,
    dispensedAt: row.dispensed_at ? String(row.dispensed_at) : null,
    cancelledBy: row.cancelled_by ? String(row.cancelled_by) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
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
    department: string;
    applicantId: string;
    indication: string;
    indicationMeta: Record<string, unknown>;
    bloodType: string;
    component: string;
    unitCount: number;
    urgency: string;
  },
  tx: DbExecutor,
): Promise<{ req: TransfusionRequest; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.blood_transfusion_requests WHERE request_no = ${input.requestNo}`;
  if (existing.length > 0) {
    return { req: mapRow(existing[0]), created: false };
  }
  const rows = await tx`
    INSERT INTO clinical.blood_transfusion_requests
      (request_no, visit_id, patient_id, department, applicant_id, indication,
       indication_meta, blood_type, component, unit_count, urgency)
    VALUES
      (${input.requestNo}, ${input.visitId}, ${input.patientId}, ${input.department},
       ${input.applicantId}, ${input.indication}, ${input.indicationMeta}::jsonb,
       ${input.bloodType}, ${input.component}, ${input.unitCount}, ${input.urgency})
    ON CONFLICT (request_no) DO NOTHING
    RETURNING ${tx.unsafe(COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(COLS)} FROM clinical.blood_transfusion_requests WHERE request_no = ${input.requestNo}`;
    return { req: mapRow(back[0]), created: false };
  }
  return { req: mapRow(rows[0]), created: true };
}

export async function getById(id: string, sql?: DbExecutor) {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.blood_transfusion_requests WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function lockById(id: string, tx: DbExecutor) {
  const rows = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.blood_transfusion_requests
    WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function listRequests(sql?: DbExecutor): Promise<TransfusionRequest[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(COLS)} FROM clinical.blood_transfusion_requests
    ORDER BY created_at DESC`;
  return rows.map((r: Record<string, unknown>) => mapRow(r));
}

export async function patchRequest(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
): Promise<TransfusionRequest> {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.blood_transfusion_requests SET ${setClause}, updated_at = now()
     WHERE id = $${cols.length + 1} RETURNING ${COLS}`,
    [...values, id],
  );
  return mapRow(rows[0]);
}

export async function listStock(sql?: DbExecutor): Promise<BloodStock[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id, blood_type, component, batch_no, units, expiry_date
    FROM clinical.blood_stock ORDER BY blood_type, component, batch_no`;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    bloodType: String(r.blood_type),
    component: String(r.component),
    batchNo: String(r.batch_no),
    units: Number(r.units),
    expiryDate: r.expiry_date ? String(r.expiry_date) : null,
  }));
}

/** 发血时锁定库存行，扣减后返回余量；库存不足返回 null（调用方抛 409）。 */
export async function deductStock(
  bloodType: string,
  component: string,
  units: number,
  tx: DbExecutor,
): Promise<BloodStock | null> {
  const rows = await tx`
    SELECT id, blood_type, component, batch_no, units, expiry_date
    FROM clinical.blood_stock
    WHERE blood_type = ${bloodType} AND component = ${component}
    ORDER BY expiry_date IS NULL, expiry_date ASC
    FOR UPDATE`;
  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  const available = Number(row.units);
  if (available < units) return null;
  const updated = await tx`
    UPDATE clinical.blood_stock SET units = units - ${units}, updated_at = now()
    WHERE id = ${row.id}
    RETURNING id, blood_type, component, batch_no, units, expiry_date`;
  return {
    id: String(updated[0].id),
    bloodType: String(updated[0].blood_type),
    component: String(updated[0].component),
    batchNo: String(updated[0].batch_no),
    units: Number(updated[0].units),
    expiryDate: updated[0].expiry_date ? String(updated[0].expiry_date) : null,
  };
}

export async function createTransfusion(
  input: { requestId: string; transfusedBy: string; coSignBy: string; dripRate?: string | null },
  tx: DbExecutor,
) {
  const rows = await tx`
    INSERT INTO clinical.blood_transfusions
      (request_id, transfused_by, co_sign_by, drip_rate, start_at)
    VALUES (${input.requestId}, ${input.transfusedBy}, ${input.coSignBy},
            ${input.dripRate ?? null}, now())
    RETURNING id, request_id, transfused_by, co_sign_by, drip_rate, start_at, end_at, vital_signs, status, stop_reason, created_at, updated_at`;
  return rows[0];
}

export async function getTransfusionByRequest(requestId: string, sql?: DbExecutor) {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id, request_id, transfused_by, co_sign_by, drip_rate, start_at, end_at,
           vital_signs, status, stop_reason, created_at, updated_at
    FROM clinical.blood_transfusions WHERE request_id = ${requestId}`;
  return rows.length > 0 ? rows[0] : null;
}

export async function patchTransfusion(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
) {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.blood_transfusions SET ${setClause}, updated_at = now()
     WHERE id = $${cols.length + 1} RETURNING id, request_id, transfused_by, co_sign_by,
     drip_rate, start_at, end_at, vital_signs, status, stop_reason, created_at, updated_at`,
    [...values, id],
  );
  return rows[0];
}

export async function addReaction(
  input: {
    transfusionId: string;
    severity: string;
    symptom: string;
    action: string;
    outcome?: string | null;
    reportedBy: string;
  },
  tx: DbExecutor,
) {
  const rows = await tx`
    INSERT INTO clinical.blood_transfusion_reactions
      (transfusion_id, severity, symptom, action, outcome, reported_by)
    VALUES (${input.transfusionId}, ${input.severity}, ${input.symptom},
            ${input.action}, ${input.outcome ?? null}, ${input.reportedBy})
    RETURNING id, transfusion_id, severity, symptom, action, outcome, reported_by, reported_at`;
  return rows[0];
}

export async function listReactions(transfusionId: string, sql?: DbExecutor) {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id, transfusion_id, severity, symptom, action, outcome, reported_by, reported_at
    FROM clinical.blood_transfusion_reactions WHERE transfusion_id = ${transfusionId}
    ORDER BY reported_at ASC`;
  return rows;
}
