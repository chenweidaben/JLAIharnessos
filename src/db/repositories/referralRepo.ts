/**
 * 健澜科技 jlmedaios - 双向转诊 Repository（M3-R）
 *
 * 转诊单 / 随附资料读写。
 * 并发：referral_no 唯一约束；状态推进白名单 + FOR UPDATE 行锁。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export type ReferralDirection = 'incoming' | 'outgoing';
export type ReferralStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'cancelled';
export type ReferralDocType =
  | 'dicom'
  | 'front_page'
  | 'diagnosis'
  | 'lab'
  | 'exam'
  | 'other';

export interface ReferralOrder {
  id: string;
  referralNo: string;
  direction: ReferralDirection;
  patientId: string | null;
  profileId: string | null;
  patientName: string | null;
  gender: string | null;
  birthDate: string | null;
  sourceOrg: string;
  sourceDept: string | null;
  sourceDoctor: string | null;
  targetOrg: string;
  targetDept: string | null;
  reason: string;
  urgency: 'normal' | 'urgent';
  status: ReferralStatus;
  encounterId: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  rejectedReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralDocument {
  id: string;
  referralId: string;
  docType: ReferralDocType;
  title: string;
  contentRef: string | null;
  contentText: string | null;
  sourceOrg: string | null;
  receivedAt: string;
  createdAt: string;
}

const ORDER_COLS = `
  id, referral_no, direction, patient_id, profile_id, patient_name, gender,
  birth_date, source_org, source_dept, source_doctor, target_org, target_dept,
  reason, urgency, status, encounter_id, accepted_by, accepted_at,
  rejected_reason, created_by, created_at, updated_at
`;

const DOC_COLS = `
  id, referral_id, doc_type, title, content_ref, content_text,
  source_org, received_at, created_at
`;

function mapOrder(r: Record<string, unknown>): ReferralOrder {
  return {
    id: String(r.id),
    referralNo: String(r.referral_no),
    direction: r.direction as ReferralDirection,
    patientId: r.patient_id ? String(r.patient_id) : null,
    profileId: r.profile_id ? String(r.profile_id) : null,
    patientName: r.patient_name ? String(r.patient_name) : null,
    gender: r.gender ? String(r.gender) : null,
    birthDate: r.birth_date ? String(r.birth_date) : null,
    sourceOrg: String(r.source_org),
    sourceDept: r.source_dept ? String(r.source_dept) : null,
    sourceDoctor: r.source_doctor ? String(r.source_doctor) : null,
    targetOrg: String(r.target_org),
    targetDept: r.target_dept ? String(r.target_dept) : null,
    reason: String(r.reason),
    urgency: r.urgency as 'normal' | 'urgent',
    status: r.status as ReferralStatus,
    encounterId: r.encounter_id ? String(r.encounter_id) : null,
    acceptedBy: r.accepted_by ? String(r.accepted_by) : null,
    acceptedAt: r.accepted_at ? String(r.accepted_at) : null,
    rejectedReason: r.rejected_reason ? String(r.rejected_reason) : null,
    createdBy: r.created_by ? String(r.created_by) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapDoc(r: Record<string, unknown>): ReferralDocument {
  return {
    id: String(r.id),
    referralId: String(r.referral_id),
    docType: r.doc_type as ReferralDocType,
    title: String(r.title),
    contentRef: r.content_ref ? String(r.content_ref) : null,
    contentText: r.content_text ? String(r.content_text) : null,
    sourceOrg: r.source_org ? String(r.source_org) : null,
    receivedAt: String(r.received_at),
    createdAt: String(r.created_at),
  };
}

/* ------------------------------------------------------------------ */
/* 单号                                                                */
/* ------------------------------------------------------------------ */

/** 生成转诊单号：REF + yyyymmdd + 4 位序列。 */
export async function nextReferralNo(tx: DbExecutor): Promise<string> {
  const rows = await tx`SELECT nextval('clinical.referral_no_seq')::bigint AS n`;
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  return `REF${ymd}${String(rows[0].n).padStart(4, '0')}`;
}

/* ------------------------------------------------------------------ */
/* 转诊单                                                              */
/* ------------------------------------------------------------------ */

/** 创建转诊单（幂等由 referral_no 唯一约束兜底）。 */
export async function insertReferral(
  input: {
    referralNo: string;
    direction: ReferralDirection;
    patientId?: string | null;
    profileId?: string | null;
    patientName?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    sourceOrg: string;
    sourceDept?: string | null;
    sourceDoctor?: string | null;
    targetOrg: string;
    targetDept?: string | null;
    reason: string;
    urgency?: 'normal' | 'urgent';
    status?: ReferralStatus;
    createdBy?: string | null;
  },
  tx: DbExecutor,
): Promise<ReferralOrder> {
  const rows = await tx`
    INSERT INTO clinical.referral_orders (
      referral_no, direction, patient_id, profile_id, patient_name, gender,
      birth_date, source_org, source_dept, source_doctor, target_org,
      target_dept, reason, urgency, status, created_by
    ) VALUES (
      ${input.referralNo}, ${input.direction},
      ${input.patientId ?? null}, ${input.profileId ?? null},
      ${input.patientName ?? null}, ${input.gender ?? null},
      ${input.birthDate ?? null},
      ${input.sourceOrg}, ${input.sourceDept ?? null}, ${input.sourceDoctor ?? null},
      ${input.targetOrg}, ${input.targetDept ?? null},
      ${input.reason}, ${input.urgency ?? 'normal'},
      ${input.status ?? 'submitted'}, ${input.createdBy ?? null}
    )
    RETURNING ${tx.unsafe(ORDER_COLS)}
  `;
  return mapOrder(rows[0] as Record<string, unknown>);
}

/** 按 id 查找转诊单。 */
export async function getReferralById(
  id: string,
  db?: DbExecutor,
): Promise<ReferralOrder | null> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(ORDER_COLS)} FROM clinical.referral_orders WHERE id = ${id}
  `;
  return rows.length > 0 ? mapOrder(rows[0] as Record<string, unknown>) : null;
}

/** 按 id 查找并加行锁。 */
export async function lockReferral(
  id: string,
  tx: DbExecutor,
): Promise<ReferralOrder | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(ORDER_COLS)} FROM clinical.referral_orders
     WHERE id = ${id} FOR UPDATE
  `;
  return rows.length > 0 ? mapOrder(rows[0] as Record<string, unknown>) : null;
}

/** 列出转诊单（可按方向/状态过滤，最新在前）。 */
export async function listReferrals(
  filter: { direction?: ReferralDirection; status?: ReferralStatus } = {},
  db?: DbExecutor,
): Promise<ReferralOrder[]> {
  const ex = db ?? getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.direction) {
    params.push(filter.direction);
    conditions.push(`direction = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await ex.unsafe(
    `SELECT ${ORDER_COLS} FROM clinical.referral_orders ${where}
      ORDER BY created_at DESC`,
    params,
  );
  return (rows as Record<string, unknown>[]).map(mapOrder);
}

/**
 * 条件式状态推进（仅当当前状态符合预期时更新）。
 * 返回更新后的订单；若当前状态不符则返回 null（由聚合器判为 409）。
 */
export async function advanceReferralStatus(
  id: string,
  expectedCurrent: ReferralStatus[],
  patch: {
    status: ReferralStatus;
    encounterId?: string | null;
    acceptedBy?: string | null;
    acceptedAt?: Date;
    rejectedReason?: string | null;
  },
  tx: DbExecutor,
): Promise<ReferralOrder | null> {
  const sets: string[] = ['status = $2'];
  const params: unknown[] = [id, patch.status];
  if (patch.encounterId !== undefined) {
    params.push(patch.encounterId);
    sets.push(`encounter_id = $${params.length}`);
  }
  if (patch.acceptedBy !== undefined) {
    params.push(patch.acceptedBy);
    sets.push(`accepted_by = $${params.length}`);
  }
  if (patch.acceptedAt !== undefined) {
    params.push(patch.acceptedAt);
    sets.push(`accepted_at = $${params.length}`);
  }
  if (patch.rejectedReason !== undefined) {
    params.push(patch.rejectedReason);
    sets.push(`rejected_reason = $${params.length}`);
  }
  params.push(expectedCurrent);
  const rows = await tx.unsafe(
    `UPDATE clinical.referral_orders SET ${sets.join(', ')}
      WHERE id = $1 AND status = ANY($${params.length})
    RETURNING ${ORDER_COLS}`,
    params,
  );
  return rows.length > 0 ? mapOrder(rows[0] as Record<string, unknown>) : null;
}

/* ------------------------------------------------------------------ */
/* 随附资料                                                            */
/* ------------------------------------------------------------------ */

/** 添加随附资料。 */
export async function insertReferralDocument(
  input: {
    referralId: string;
    docType: ReferralDocType;
    title: string;
    contentRef?: string | null;
    contentText?: string | null;
    sourceOrg?: string | null;
  },
  tx: DbExecutor,
): Promise<ReferralDocument> {
  const rows = await tx`
    INSERT INTO clinical.referral_documents (
      referral_id, doc_type, title, content_ref, content_text, source_org
    ) VALUES (
      ${input.referralId}, ${input.docType}, ${input.title},
      ${input.contentRef ?? null}, ${input.contentText ?? null},
      ${input.sourceOrg ?? null}
    )
    RETURNING ${tx.unsafe(DOC_COLS)}
  `;
  return mapDoc(rows[0] as Record<string, unknown>);
}

/** 列出转诊单的全部随附资料。 */
export async function listReferralDocuments(
  referralId: string,
  db?: DbExecutor,
): Promise<ReferralDocument[]> {
  const ex = db ?? getDb();
  const rows = await ex`
    SELECT ${ex.unsafe(DOC_COLS)} FROM clinical.referral_documents
     WHERE referral_id = ${referralId}
     ORDER BY received_at ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapDoc);
}
