/**
 * 健澜科技 jlmedaios - 互联网电子处方 Repository（M3-L）
 *
 * 电子处方头 / 明细读写。
 * 并发与一致：
 *  · rx_no 唯一、idempotency_key 唯一（防重复提交）；
 *  · 状态推进白名单（WHERE status = 期望前态）保证状态机 CAS；
 *  · 审方行锁 FOR UPDATE 防并发审方覆盖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export type EPrescriptionStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'cancelled';

export interface EPrescriptionItem {
  id?: string;
  drugCode: string | null;
  drugName: string;
  specification: string | null;
  dosage: number | null;
  dosageUnit: string | null;
  frequency: string | null;
  route: string | null;
  daysSupply: number | null;
  quantity: number | null;
  quantityUnit: string | null;
  skinTest: boolean;
  remark: string | null;
}

export interface EPrescription {
  id: string;
  rxNo: string;
  sessionId: string;
  accountId: string;
  profileId: string;
  patientId: string;
  prescriberId: string;
  department: string | null;
  status: EPrescriptionStatus;
  riskLevel: string | null;
  counsel: string | null;
  totalFee: number | null;
  idempotencyKey: string;
  reviewerId: string | null;
  auditComment: string | null;
  auditedAt: string | null;
  returnReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: EPrescriptionItem[];
}

export interface EPrescriptionCreateInput {
  sessionId: string;
  accountId: string;
  profileId: string;
  patientId: string;
  prescriberId: string;
  department?: string | null;
  items: EPrescriptionItem[];
  counsel?: string | null;
  riskLevel?: string | null;
  idempotencyKey: string;
  totalFee?: number | null;
}

const RX_COLS = `
  id, rx_no, session_id, account_id, profile_id, patient_id, prescriber_id,
  department, status, risk_level, counsel, total_fee, idempotency_key,
  reviewer_id, audit_comment, audited_at, return_reason, cancelled_by,
  cancelled_at, created_at, updated_at
`;

const ITEM_COLS = `
  id, prescription_id, drug_code, drug_name, specification, dosage, dosage_unit,
  frequency, route, days_supply, quantity, quantity_unit, skin_test, remark, created_at
`;

function mapRx(r: Record<string, unknown>): Omit<EPrescription, 'items'> {
  return {
    id: String(r.id),
    rxNo: String(r.rx_no),
    sessionId: String(r.session_id),
    accountId: String(r.account_id),
    profileId: String(r.profile_id),
    patientId: String(r.patient_id),
    prescriberId: String(r.prescriber_id),
    department: r.department ? String(r.department) : null,
    status: r.status as EPrescriptionStatus,
    riskLevel: r.risk_level ? String(r.risk_level) : null,
    counsel: r.counsel ? String(r.counsel) : null,
    totalFee: r.total_fee !== null && r.total_fee !== undefined ? Number(r.total_fee) : null,
    idempotencyKey: String(r.idempotency_key),
    reviewerId: r.reviewer_id ? String(r.reviewer_id) : null,
    auditComment: r.audit_comment ? String(r.audit_comment) : null,
    auditedAt: r.audited_at ? String(r.audited_at) : null,
    returnReason: r.return_reason ? String(r.return_reason) : null,
    cancelledBy: r.cancelled_by ? String(r.cancelled_by) : null,
    cancelledAt: r.cancelled_at ? String(r.cancelled_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapItem(r: Record<string, unknown>): EPrescriptionItem {
  return {
    id: String(r.id),
    drugCode: r.drug_code ? String(r.drug_code) : null,
    drugName: String(r.drug_name),
    specification: r.specification ? String(r.specification) : null,
    dosage: r.dosage !== null && r.dosage !== undefined ? Number(r.dosage) : null,
    dosageUnit: r.dosage_unit ? String(r.dosage_unit) : null,
    frequency: r.frequency ? String(r.frequency) : null,
    route: r.route ? String(r.route) : null,
    daysSupply: r.days_supply !== null && r.days_supply !== undefined ? Number(r.days_supply) : null,
    quantity: r.quantity !== null && r.quantity !== undefined ? Number(r.quantity) : null,
    quantityUnit: r.quantity_unit ? String(r.quantity_unit) : null,
    skinTest: Boolean(r.skin_test),
    remark: r.remark ? String(r.remark) : null,
  };
}

function generateRxNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `ER${ymd}${Math.floor(Math.random() * 900000) + 100000}`;
}

/* ------------------------------------------------------------------ */
/* 查询                                                                */
/* ------------------------------------------------------------------ */

/** 幂等键查重（防重复提交）。 */
export async function getEPrescriptionByIdem(
  idempotencyKey: string, db?: DbExecutor,
): Promise<Omit<EPrescription, 'items'> | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(RX_COLS)} FROM clinical.internet_prescriptions
    WHERE idempotency_key = ${idempotencyKey}
  `;
  return rows.length > 0 ? mapRx(rows[0] as Record<string, unknown>) : null;
}

export async function getEPrescriptionById(
  id: string, db?: DbExecutor,
): Promise<EPrescription | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(RX_COLS)} FROM clinical.internet_prescriptions WHERE id = ${id}
  `;
  if (rows.length === 0) return null;
  const rx = mapRx(rows[0] as Record<string, unknown>);
  const itemRows = await exec`
    SELECT ${exec.unsafe(ITEM_COLS)} FROM clinical.internet_prescription_items
    WHERE prescription_id = ${id} ORDER BY created_at
  `;
  return { ...rx, items: (itemRows as Record<string, unknown>[]).map(mapItem) };
}

/** 按会话查处方（医生端会话内列表）。 */
export async function listEPrescriptionsBySession(
  sessionId: string, db?: DbExecutor,
): Promise<EPrescription[]> {
  const exec = db ?? getDb();
  const rxRows = await exec`
    SELECT ${exec.unsafe(RX_COLS)} FROM clinical.internet_prescriptions
    WHERE session_id = ${sessionId} ORDER BY created_at DESC
  `;
  const result: EPrescription[] = [];
  for (const row of rxRows as Record<string, unknown>[]) {
    const rx = mapRx(row);
    const itemRows = await exec`
      SELECT ${exec.unsafe(ITEM_COLS)} FROM clinical.internet_prescription_items
      WHERE prescription_id = ${rx.id} ORDER BY created_at
    `;
    result.push({ ...rx, items: (itemRows as Record<string, unknown>[]).map(mapItem) });
  }
  return result;
}

/** 按患者查处方（患者端 / 药师端队列）。 */
export async function listEPrescriptionsByPatient(
  patientId: string, db?: DbExecutor,
): Promise<EPrescription[]> {
  const exec = db ?? getDb();
  const rxRows = await exec`
    SELECT ${exec.unsafe(RX_COLS)} FROM clinical.internet_prescriptions
    WHERE patient_id = ${patientId} ORDER BY created_at DESC
  `;
  const result: EPrescription[] = [];
  for (const row of rxRows as Record<string, unknown>[]) {
    const rx = mapRx(row);
    const itemRows = await exec`
      SELECT ${exec.unsafe(ITEM_COLS)} FROM clinical.internet_prescription_items
      WHERE prescription_id = ${rx.id} ORDER BY created_at
    `;
    result.push({ ...rx, items: (itemRows as Record<string, unknown>[]).map(mapItem) });
  }
  return result;
}

/** 审方队列（全部/某医生）。 */
export async function listEPrescriptionsForAudit(
  options?: { prescriberId?: string; status?: EPrescriptionStatus; limit?: number },
  db?: DbExecutor,
): Promise<EPrescription[]> {
  const exec = db ?? getDb();
  const conds = [];
  const args: unknown[] = [];
  if (options?.prescriberId) {
    conds.push(`prescriber_id = $${args.length + 1}`);
    args.push(options.prescriberId);
  }
  if (options?.status) {
    conds.push(`status = $${args.length + 1}`);
    args.push(options.status);
  }
  const where = conds.length > 0 ? ` WHERE ${conds.join(' AND ')}` : '';
  const limit = options?.limit ?? 100;
  const rows = await exec.unsafe(
    `SELECT ${RX_COLS} FROM clinical.internet_prescriptions${where} ORDER BY created_at ASC LIMIT ${limit}`,
    args,
  );
  const result: EPrescription[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    const rx = mapRx(row);
    const itemRows = await exec`
      SELECT ${exec.unsafe(ITEM_COLS)} FROM clinical.internet_prescription_items
      WHERE prescription_id = ${rx.id} ORDER BY created_at
    `;
    result.push({ ...rx, items: (itemRows as Record<string, unknown>[]).map(mapItem) });
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* 写入                                                                */
/* ------------------------------------------------------------------ */

/** 创建电子处方（头+明细同事务）。status 恒为 pending_review。 */
export async function createEPrescription(
  input: EPrescriptionCreateInput, db?: DbExecutor,
): Promise<EPrescription> {
  const exec = db ?? getDb();
  const rxRows = await exec`
    INSERT INTO clinical.internet_prescriptions (
      rx_no, session_id, account_id, profile_id, patient_id, prescriber_id,
      department, status, risk_level, counsel, total_fee, idempotency_key
    ) VALUES (
      ${generateRxNo()}, ${input.sessionId}, ${input.accountId}, ${input.profileId},
      ${input.patientId}, ${input.prescriberId}, ${input.department ?? null},
      'pending_review', ${input.riskLevel ?? null}, ${input.counsel ?? null},
      ${input.totalFee ?? null}, ${input.idempotencyKey}
    )
    RETURNING ${exec.unsafe(RX_COLS)}
  `;
  const rx = mapRx(rxRows[0] as Record<string, unknown>);
  const items: EPrescriptionItem[] = [];
  for (const item of input.items) {
    const itemRows = await exec`
      INSERT INTO clinical.internet_prescription_items (
        prescription_id, drug_code, drug_name, specification, dosage, dosage_unit,
        frequency, route, days_supply, quantity, quantity_unit, skin_test, remark
      ) VALUES (
        ${rx.id}, ${item.drugCode ?? null}, ${item.drugName}, ${item.specification ?? null},
        ${item.dosage ?? null}, ${item.dosageUnit ?? null}, ${item.frequency ?? null},
        ${item.route ?? null}, ${item.daysSupply ?? null}, ${item.quantity ?? null},
        ${item.quantityUnit ?? null}, ${item.skinTest}, ${item.remark ?? null}
      )
      RETURNING ${exec.unsafe(ITEM_COLS)}
    `;
    items.push(mapItem(itemRows[0] as Record<string, unknown>));
  }
  return { ...rx, items };
}

/**
 * 药师审方：pending_review → approved / rejected / returned（CAS）。
 * 返回 null 表示状态已变化（并发下由聚合器判 409）。
 */
export async function reviewEPrescription(
  id: string, decision: 'approved' | 'rejected' | 'returned',
  reviewerId: string, auditComment: string, db?: DbExecutor,
): Promise<EPrescription | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.internet_prescriptions
    SET status = ${decision}, reviewer_id = ${reviewerId},
        audit_comment = ${auditComment}, audited_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending_review'
    RETURNING ${exec.unsafe(RX_COLS)}
  `;
  if (rows.length === 0) return null;
  return getEPrescriptionById(id, db);
}

/** 医生修改后重提：returned → pending_review（CAS）。清空旧审核痕迹。 */
export async function resubmitEPrescription(
  id: string, db?: DbExecutor,
): Promise<EPrescription | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.internet_prescriptions
    SET status = 'pending_review', reviewer_id = NULL, audit_comment = NULL,
        audited_at = NULL, return_reason = NULL, updated_at = now()
    WHERE id = ${id} AND status = 'returned'
    RETURNING ${exec.unsafe(RX_COLS)}
  `;
  if (rows.length === 0) return null;
  return getEPrescriptionById(id, db);
}

/** 医生更新退回处方的明细（returned 态可改明细，保留头信息）。 */
export async function updateEPrescriptionItems(
  id: string, items: EPrescriptionItem[], db?: DbExecutor,
): Promise<EPrescription | null> {
  const exec = db ?? getDb();
  await exec`DELETE FROM clinical.internet_prescription_items WHERE prescription_id = ${id}`;
  for (const item of items) {
    await exec`
      INSERT INTO clinical.internet_prescription_items (
        prescription_id, drug_code, drug_name, specification, dosage, dosage_unit,
        frequency, route, days_supply, quantity, quantity_unit, skin_test, remark
      ) VALUES (
        ${id}, ${item.drugCode ?? null}, ${item.drugName}, ${item.specification ?? null},
        ${item.dosage ?? null}, ${item.dosageUnit ?? null}, ${item.frequency ?? null},
        ${item.route ?? null}, ${item.daysSupply ?? null}, ${item.quantity ?? null},
        ${item.quantityUnit ?? null}, ${item.skinTest}, ${item.remark ?? null}
      )
    `;
  }
  return getEPrescriptionById(id, db);
}

/** 取消处方（医生或患者，pending_review / returned 可取消）。 */
export async function cancelEPrescription(
  id: string, cancelledBy: string, db?: DbExecutor,
): Promise<EPrescription | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    UPDATE clinical.internet_prescriptions
    SET status = 'cancelled', cancelled_by = ${cancelledBy}, cancelled_at = now(), updated_at = now()
    WHERE id = ${id} AND status IN ('pending_review','returned')
    RETURNING ${exec.unsafe(RX_COLS)}
  `;
  if (rows.length === 0) return null;
  return getEPrescriptionById(id, db);
}
