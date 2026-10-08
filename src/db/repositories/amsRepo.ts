/**
 * 健澜科技 jlmedaios - 抗菌药物管理 Repository（M14-A）
 *
 * clinical.antibiotic_catalog / ams_prescriber_grants / ams_special_approvals /
 * ams_reviews / ams_usage_records 读写。
 *
 * 并发与一致性：
 *  - 处方授权按 prescriber_id 唯一（upsert）；
 *  - 特殊使用级审批、点评状态机以 CAS（WHERE status=…）更新，重复审批/签名返回 null；
 *  - jsonb 一律以 tx.json(纯对象) 写入，禁止 JSON.stringify 字符串。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';
import type { AbxLevel, PharmClass } from '../../medical-tools/ams/amsRules.js';

/** 12 位十六进制（48 位加密随机）后缀：避免编号在高并发/重跑下命中唯一约束。 */
function randomSuffix(): string {
  const buf = new Uint8Array(6);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// 抗菌药物分级目录
// ---------------------------------------------------------------------------

export interface AntibioticCatalog {
  id: string;
  drugId: string;
  drugCode: string;
  genericName: string | null;
  atcLevel: AbxLevel;
  pharmClass: PharmClass;
  ddd: number;
  dddUnit: string;
  defaultRoute: string | null;
}

const CATALOG_COLS = `
  ac.id, ac.drug_id, dc.drug_code, ac.generic_name, ac.atc_level, ac.pharm_class,
  ac.ddd, ac.ddd_unit, ac.default_route
`;

function mapCatalog(row: Record<string, unknown>): AntibioticCatalog {
  return {
    id: String(row.id),
    drugId: String(row.drug_id),
    drugCode: String(row.drug_code),
    genericName: row.generic_name ? String(row.generic_name) : null,
    atcLevel: row.atc_level as AbxLevel,
    pharmClass: row.pharm_class as PharmClass,
    ddd: Number(row.ddd),
    dddUnit: String(row.ddd_unit),
    defaultRoute: row.default_route ? String(row.default_route) : null,
  };
}

export async function listCatalog(
  filter: { atcLevel?: string } = {},
  sql?: DbExecutor,
): Promise<AntibioticCatalog[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(CATALOG_COLS)}
    FROM clinical.antibiotic_catalog ac
    JOIN clinical.drug_catalog dc ON dc.id = ac.drug_id
    WHERE (${filter.atcLevel ?? ''} = '' OR ac.atc_level = ${filter.atcLevel ?? ''})
    ORDER BY dc.drug_code ASC`;
  return (rows as Record<string, unknown>[]).map(mapCatalog);
}

export async function getCatalogByDrugId(
  drugId: string, sql?: DbExecutor,
): Promise<AntibioticCatalog | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(CATALOG_COLS)}
    FROM clinical.antibiotic_catalog ac
    JOIN clinical.drug_catalog dc ON dc.id = ac.drug_id
    WHERE ac.drug_id = ${drugId}`;
  return rows.length > 0 ? mapCatalog(rows[0] as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// 医师处方授权
// ---------------------------------------------------------------------------

export interface PrescriberGrant {
  id: string;
  prescriberId: string;
  prescriberName: string | null;
  prescriberUsername: string | null;
  prescriberTitle: string | null;
  maxLevel: AbxLevel;
  grantedBy: string | null;
  status: 'active' | 'revoked';
  grantedAt: string;
  expiresAt: string | null;
}

const GRANT_COLS = `
  g.id, g.prescriber_id, g.max_level, g.granted_by, g.status, g.granted_at, g.expires_at,
  u.name AS prescriber_name, u.username AS prescriber_username, u.title AS prescriber_title
`;

function mapGrant(row: Record<string, unknown>): PrescriberGrant {
  return {
    id: String(row.id),
    prescriberId: String(row.prescriber_id),
    prescriberName: row.prescriber_name ? String(row.prescriber_name) : null,
    prescriberUsername: row.prescriber_username ? String(row.prescriber_username) : null,
    prescriberTitle: row.prescriber_title ? String(row.prescriber_title) : null,
    maxLevel: row.max_level as AbxLevel,
    grantedBy: row.granted_by ? String(row.granted_by) : null,
    status: row.status as 'active' | 'revoked',
    grantedAt: String(row.granted_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  };
}

export async function getGrantByPrescriber(
  prescriberId: string, sql?: DbExecutor,
): Promise<PrescriberGrant | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(GRANT_COLS)}
    FROM clinical.ams_prescriber_grants g
    LEFT JOIN iam.users u ON u.id = g.prescriber_id
    WHERE g.prescriber_id = ${prescriberId}`;
  return rows.length > 0 ? mapGrant(rows[0] as Record<string, unknown>) : null;
}

export async function listGrants(sql?: DbExecutor): Promise<PrescriberGrant[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(GRANT_COLS)}
    FROM clinical.ams_prescriber_grants g
    LEFT JOIN iam.users u ON u.id = g.prescriber_id
    ORDER BY g.created_at ASC`;
  return (rows as Record<string, unknown>[]).map(mapGrant);
}

/** upsert 授权（prescriber_id 唯一）；写后重新读取（含用户名 JOIN）。 */
export async function upsertGrant(
  prescriberId: string, maxLevel: AbxLevel, grantedBy: string, tx: DbExecutor,
): Promise<PrescriberGrant> {
  await tx`
    INSERT INTO clinical.ams_prescriber_grants (prescriber_id, max_level, granted_by, status)
    VALUES (${prescriberId}, ${maxLevel}, ${grantedBy}, 'active')
    ON CONFLICT (prescriber_id) DO UPDATE
      SET max_level = EXCLUDED.max_level, granted_by = EXCLUDED.granted_by,
          status = 'active', updated_at = now()
    RETURNING id`;
  const back = await getGrantByPrescriber(prescriberId, tx);
  if (!back) throw new Error('授权写入后读取失败');
  return back;
}

// ---------------------------------------------------------------------------
// 特殊使用级会诊审批
// ---------------------------------------------------------------------------

export interface SpecialApproval {
  id: string;
  approvalNo: string;
  visitId: string;
  patientId: string;
  patientName: string | null;
  prescriberId: string;
  drugId: string;
  drugName: string | null;
  indication: string | null;
  consultationOpinion: string | null;
  consultantId: string | null;
  approverId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  orderId: string | null;
  rejectReason: string | null;
  createdAt: string;
  approvedAt: string | null;
}

const SPECIAL_BASE_COLS = `
  id, approval_no, visit_id, patient_id, prescriber_id, drug_id, indication,
  consultation_opinion, consultant_id, approver_id, status, order_id, reject_reason,
  created_at, approved_at
`;
const SPECIAL_COLS = `
  sa.id, sa.approval_no, sa.visit_id, sa.patient_id, sa.prescriber_id, sa.drug_id,
  sa.indication, sa.consultation_opinion, sa.consultant_id, sa.approver_id, sa.status,
  sa.order_id, sa.reject_reason, sa.created_at, sa.approved_at,
  dc.generic_name AS drug_name, p.name_masked AS patient_name
`;
/** 特殊审批富对象查询的统一 FROM/JOIN（按 sa 别名）。 */
const SPECIAL_FROM = `
  FROM clinical.ams_special_approvals sa
  LEFT JOIN clinical.drug_catalog dc ON dc.id = sa.drug_id
  LEFT JOIN clinical.patients p ON p.id = sa.patient_id
`;

function mapSpecial(row: Record<string, unknown>): SpecialApproval {
  return {
    id: String(row.id),
    approvalNo: String(row.approval_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    patientName: row.patient_name ? String(row.patient_name) : null,
    prescriberId: String(row.prescriber_id),
    drugId: String(row.drug_id),
    drugName: row.drug_name ? String(row.drug_name) : null,
    indication: row.indication ? String(row.indication) : null,
    consultationOpinion: row.consultation_opinion ? String(row.consultation_opinion) : null,
    consultantId: row.consultant_id ? String(row.consultant_id) : null,
    approverId: row.approver_id ? String(row.approver_id) : null,
    status: row.status as 'pending' | 'approved' | 'rejected',
    orderId: row.order_id ? String(row.order_id) : null,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    createdAt: String(row.created_at),
    approvedAt: row.approved_at ? String(row.approved_at) : null,
  };
}

function genApprovalNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `AMSA${ymd}${randomSuffix()}`;
}

export interface SpecialApprovalInput {
  visitId: string;
  patientId: string;
  prescriberId: string;
  drugId: string;
  indication?: string | null;
  consultationOpinion?: string | null;
  consultantId?: string | null;
}

export async function createSpecialApproval(
  input: SpecialApprovalInput, tx: DbExecutor,
): Promise<SpecialApproval> {
  const rows = await tx`
    INSERT INTO clinical.ams_special_approvals (
      approval_no, visit_id, patient_id, prescriber_id, drug_id, indication,
      consultation_opinion, consultant_id
    ) VALUES (
      ${genApprovalNo()}, ${input.visitId}, ${input.patientId}, ${input.prescriberId},
      ${input.drugId}, ${input.indication ?? null}, ${input.consultationOpinion ?? null},
      ${input.consultantId ?? null}
    )
    RETURNING id`;
  const created = await getSpecialById(String(rows[0].id), tx);
  if (!created) throw new Error('特殊审批写入后读取失败');
  return created;
}

export async function getSpecialById(
  id: string, sql?: DbExecutor,
): Promise<SpecialApproval | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SPECIAL_COLS)}
    ${db.unsafe(SPECIAL_FROM)}
    WHERE sa.id = ${id}`;
  return rows.length > 0 ? mapSpecial(rows[0] as Record<string, unknown>) : null;
}

/** 审批通过（CAS pending -> approved），绑定 approver 与后续医嘱。 */
export async function approveSpecial(
  id: string, approverId: string, tx: DbExecutor,
): Promise<SpecialApproval | null> {
  const rows = await tx`
    UPDATE clinical.ams_special_approvals
    SET status = 'approved', approver_id = ${approverId}, approved_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending'
    RETURNING id`;
  if (rows.length === 0) return null;
  return getSpecialById(String(rows[0].id), tx);
}

/** 绑定审批后生成的医嘱（approved -> 不变，写入 order_id）。 */
export async function bindSpecialOrder(
  id: string, orderId: string, tx: DbExecutor,
): Promise<SpecialApproval | null> {
  const rows = await tx`
    UPDATE clinical.ams_special_approvals
    SET order_id = ${orderId}, updated_at = now()
    WHERE id = ${id} AND status = 'approved'
    RETURNING id`;
  if (rows.length === 0) return null;
  return getSpecialById(String(rows[0].id), tx);
}

/** 驳回（CAS pending -> rejected）。 */
export async function rejectSpecial(
  id: string, approverId: string, reason: string, tx: DbExecutor,
): Promise<SpecialApproval | null> {
  const rows = await tx`
    UPDATE clinical.ams_special_approvals
    SET status = 'rejected', approver_id = ${approverId}, reject_reason = ${reason},
        updated_at = now()
    WHERE id = ${id} AND status = 'pending'
    RETURNING id`;
  if (rows.length === 0) return null;
  return getSpecialById(String(rows[0].id), tx);
}

/** 某就诊某药品是否已有 approved 的特殊使用级审批（使用前校验）。 */
export async function getApprovedSpecial(
  visitId: string, drugId: string, sql?: DbExecutor,
): Promise<SpecialApproval | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SPECIAL_COLS)}
    ${db.unsafe(SPECIAL_FROM)}
    WHERE sa.visit_id = ${visitId} AND sa.drug_id = ${drugId} AND sa.status = 'approved'
    ORDER BY sa.approved_at DESC NULLS LAST, sa.created_at DESC LIMIT 1`;
  return rows.length > 0 ? mapSpecial(rows[0] as Record<string, unknown>) : null;
}

/** 特殊审批列表（可按状态过滤）。 */
export async function listSpecialApprovals(
  filter: { status?: string } = {},
  sql?: DbExecutor,
): Promise<SpecialApproval[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SPECIAL_COLS)}
    ${db.unsafe(SPECIAL_FROM)}
    WHERE (${filter.status ?? ''} = '' OR sa.status = ${filter.status ?? ''})
    ORDER BY sa.created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapSpecial);
}

// ---------------------------------------------------------------------------
// 处方/医嘱/围术期专项点评
// ---------------------------------------------------------------------------

export type ReviewType = 'perioperative' | 'prescription' | 'order';

export interface AmsReview {
  id: string;
  reviewNo: string;
  reviewType: ReviewType;
  targetId: string | null;
  visitId: string;
  patientId: string;
  result: 'rational' | 'irrational';
  issueTypes: string[];
  detail: Record<string, unknown>;
  status: 'pending_review' | 'signed' | 'returned';
  reviewerId: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const REVIEW_COLS = `
  id, review_no, review_type, target_id, visit_id, patient_id, result, issue_types,
  detail, status, reviewer_id, review_note, created_at, reviewed_at
`;

function mapReview(row: Record<string, unknown>): AmsReview {
  return {
    id: String(row.id),
    reviewNo: String(row.review_no),
    reviewType: row.review_type as ReviewType,
    targetId: row.target_id ? String(row.target_id) : null,
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    result: row.result as 'rational' | 'irrational',
    issueTypes: (row.issue_types as string[]) ?? [],
    detail: (row.detail as Record<string, unknown>) ?? {},
    status: row.status as 'pending_review' | 'signed' | 'returned',
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : null,
    reviewNote: row.review_note ? String(row.review_note) : null,
    createdAt: String(row.created_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

function genReviewNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `AMSR${ymd}${randomSuffix()}`;
}

export interface AmsReviewInput {
  reviewType: ReviewType;
  targetId?: string | null;
  visitId: string;
  patientId: string;
  result: 'rational' | 'irrational';
  issueTypes: string[];
  detail?: Record<string, unknown>;
}

export async function createReview(
  input: AmsReviewInput, tx: DbExecutor,
): Promise<AmsReview> {
  const rows = await tx`
    INSERT INTO clinical.ams_reviews (
      review_no, review_type, target_id, visit_id, patient_id, result, issue_types, detail
    ) VALUES (
      ${genReviewNo()}, ${input.reviewType}, ${input.targetId ?? null}, ${input.visitId},
      ${input.patientId}, ${input.result}, ${tx.json(toJson(input.issueTypes))},
      ${tx.json(toJson(input.detail ?? {}))}
    )
    RETURNING ${tx.unsafe(REVIEW_COLS)}`;
  return mapReview(rows[0] as Record<string, unknown>);
}

export async function getReviewById(
  id: string, sql?: DbExecutor,
): Promise<AmsReview | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(REVIEW_COLS)} FROM clinical.ams_reviews WHERE id = ${id}`;
  return rows.length > 0 ? mapReview(rows[0] as Record<string, unknown>) : null;
}

export async function listReviews(
  filter: { reviewType?: string; status?: string } = {},
  sql?: DbExecutor,
): Promise<AmsReview[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(REVIEW_COLS)} FROM clinical.ams_reviews
    WHERE (${filter.reviewType ?? ''} = '' OR review_type = ${filter.reviewType ?? ''})
      AND (${filter.status ?? ''} = '' OR status = ${filter.status ?? ''})
    ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapReview);
}

/** 药师签名（CAS pending_review -> signed）。 */
export async function signReview(
  id: string, reviewerId: string, note: string, tx: DbExecutor,
): Promise<AmsReview | null> {
  const rows = await tx`
    UPDATE clinical.ams_reviews
    SET status = 'signed', reviewer_id = ${reviewerId}, review_note = ${note},
        reviewed_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending_review'
    RETURNING ${tx.unsafe(REVIEW_COLS)}`;
  return rows.length > 0 ? mapReview(rows[0] as Record<string, unknown>) : null;
}

/** 退回（CAS pending_review -> returned）。 */
export async function returnReview(
  id: string, reviewerId: string, note: string, tx: DbExecutor,
): Promise<AmsReview | null> {
  const rows = await tx`
    UPDATE clinical.ams_reviews
    SET status = 'returned', reviewer_id = ${reviewerId}, review_note = ${note},
        reviewed_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending_review'
    RETURNING ${tx.unsafe(REVIEW_COLS)}`;
  return rows.length > 0 ? mapReview(rows[0] as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// 抗菌药使用记录（DDDs / AUD 来源）
// ---------------------------------------------------------------------------

export interface AmsUsageRecord {
  id: string;
  visitId: string;
  patientId: string;
  drugId: string;
  drugName: string | null;
  orderId: string | null;
  purpose: 'prophylactic' | 'therapeutic';
  dose: number;
  doseUnit: string;
  frequency: string | null;
  route: string | null;
  usageDays: number;
  totalAmount: number | null;
  cultureSent: boolean;
  administeredAt: string;
  ddds: number;
}

const USAGE_COLS = `
  id, visit_id, patient_id, drug_id, order_id, purpose, dose, dose_unit, frequency,
  route, usage_days, total_amount, culture_sent, administered_at
`;

const USAGE_COLS_QUALIFIED = `
  u.id, u.visit_id, u.patient_id, u.drug_id, u.order_id, u.purpose, u.dose,
  u.dose_unit, u.frequency, u.route, u.usage_days, u.total_amount, u.culture_sent,
  u.administered_at, dc.generic_name AS drug_name
`;

function mapUsage(row: Record<string, unknown>, ddds: number): AmsUsageRecord {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    drugId: String(row.drug_id),
    drugName: row.drug_name ? String(row.drug_name) : null,
    orderId: row.order_id ? String(row.order_id) : null,
    purpose: row.purpose as 'prophylactic' | 'therapeutic',
    dose: Number(row.dose),
    doseUnit: String(row.dose_unit),
    frequency: row.frequency ? String(row.frequency) : null,
    route: row.route ? String(row.route) : null,
    usageDays: Number(row.usage_days),
    totalAmount: row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null,
    cultureSent: Boolean(row.culture_sent),
    administeredAt: String(row.administered_at),
    ddds,
  };
}

export interface AmsUsageInput {
  visitId: string;
  patientId: string;
  drugId: string;
  orderId?: string | null;
  purpose: 'prophylactic' | 'therapeutic';
  dose: number;
  doseUnit: string;
  frequency?: string | null;
  route?: string | null;
  usageDays?: number;
  totalAmount?: number | null;
  cultureSent?: boolean;
  administeredAt?: string | null;
}

export async function createUsage(
  input: AmsUsageInput, ddd: number, tx: DbExecutor,
): Promise<AmsUsageRecord> {
  const totalAmount = input.totalAmount ?? null;
  const rows = await tx`
    INSERT INTO clinical.ams_usage_records (
      visit_id, patient_id, drug_id, order_id, purpose, dose, dose_unit, frequency,
      route, usage_days, total_amount, culture_sent, administered_at
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${input.drugId}, ${input.orderId ?? null},
      ${input.purpose}, ${input.dose}, ${input.doseUnit}, ${input.frequency ?? null},
      ${input.route ?? null}, ${input.usageDays ?? 1}, ${totalAmount},
      ${input.cultureSent === true}, COALESCE(${input.administeredAt ?? null}::timestamptz, now())
    )
    RETURNING ${tx.unsafe(USAGE_COLS)}`;
  const row = rows[0] as Record<string, unknown>;
  const ta = row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null;
  const ddds = ta !== null ? ta / ddd : 0;
  return mapUsage(row, Number(ddds.toFixed(2)));
}

export async function listUsage(
  filter: { visitId?: string; drugId?: string } = {},
  sql?: DbExecutor,
): Promise<Array<AmsUsageRecord & { ddd: number }>> {
  const db = sql ?? getDb();
  // 动态条件：仅在过滤值存在时加入，避免空字符串被强制转换为 uuid 绑定失败。
  type Fragment = ReturnType<DbExecutor>;
  const conds: Fragment[] = [];
  if (filter.visitId) conds.push(db`u.visit_id = ${filter.visitId}`);
  if (filter.drugId) conds.push(db`u.drug_id = ${filter.drugId}`);
  const where: Fragment =
    conds.length === 0 ? db`TRUE` : conds.reduce((acc, c) => db`${acc} AND ${c}`);
  const rows = await db`
    SELECT ${db.unsafe(USAGE_COLS_QUALIFIED)}, ac.ddd AS ddd
    FROM clinical.ams_usage_records u
    JOIN clinical.antibiotic_catalog ac ON ac.drug_id = u.drug_id
    LEFT JOIN clinical.drug_catalog dc ON dc.id = u.drug_id
    WHERE ${where}
    ORDER BY u.administered_at ASC`;
  return (rows as Record<string, unknown>[]).map((r) => {
    const rec = mapUsage(r, 0);
    const ddd = Number(r.ddd) || 0;
    const ta = rec.totalAmount ?? 0;
    return { ...rec, ddd, ddds: ddd > 0 ? Number((ta / ddd).toFixed(2)) : 0 };
  });
}
