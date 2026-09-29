/**
 * 健澜科技 jlmedaios - 病案首页 Repository（M3-A）
 *
 * clinical.medical_record_front_pages / clinical.front_page_reviews 读写。
 *
 * 并发与一致性：
 *  - 幂等汇聚：ON CONFLICT (visit_id) DO NOTHING，并发对同一出院就诊汇聚只落一份；
 *  - 条件式状态推进：UPDATE ... WHERE version=$expected AND status IN (...)，
 *    0 行即乐观锁冲突 / 非法流转，上层抛 409；
 *  - 质控留痕：业务级签名哈希链（prev_hash/cur_hash）在事务内逐行链接。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash } from 'node:crypto';
import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type FrontPageStatus = 'draft' | 'coding' | 'qc' | 'archived';
export type ReviewDecision = 'pass' | 'return';

export interface FrontPageDefect {
  field: string;
  severity: 'block' | 'major' | 'minor';
  message: string;
}

export interface FrontPage {
  id: string;
  visitId: string;
  patientId: string;
  department: string;
  status: FrontPageStatus;
  version: number;
  admitAt: string | null;
  dischargeAt: string | null;
  ward: string | null;
  bedNo: string | null;
  primaryDiagnosis: string | null;
  primaryDiagnosisCode: string | null;
  secondaryDiagnoses: Array<Record<string, unknown>>;
  operations: Array<Record<string, unknown>>;
  totalFee: string | null;
  codedBy: string | null;
  codedAt: string | null;
  defects: FrontPageDefect[];
  qualityScore: number | null;
  archivedBy: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FrontPageReview {
  id: string;
  frontPageId: string;
  reviewerId: string;
  decision: ReviewDecision;
  defects: FrontPageDefect[];
  comment: string | null;
  signatureAt: string;
  prevHash: string | null;
  curHash: string;
  createdAt: string;
}

const PAGE_COLS = `
  id, visit_id, patient_id, department, status, version,
  admit_at, discharge_at, ward, bed_no,
  primary_diagnosis, primary_diagnosis_code, secondary_diagnoses, operations,
  total_fee, coded_by, coded_at, defects, quality_score,
  archived_by, archived_at, created_at, updated_at
`;

function asArray(v: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
  if (typeof v === 'string' && v.trim()) {
    try {
      const p: unknown = JSON.parse(v);
      return Array.isArray(p) ? (p as Array<Record<string, unknown>>) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapPage(row: Record<string, unknown>): FrontPage {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    department: String(row.department),
    status: row.status as FrontPageStatus,
    version: Number(row.version),
    admitAt: row.admit_at ? String(row.admit_at) : null,
    dischargeAt: row.discharge_at ? String(row.discharge_at) : null,
    ward: row.ward ? String(row.ward) : null,
    bedNo: row.bed_no ? String(row.bed_no) : null,
    primaryDiagnosis: row.primary_diagnosis ? String(row.primary_diagnosis) : null,
    primaryDiagnosisCode: row.primary_diagnosis_code ? String(row.primary_diagnosis_code) : null,
    secondaryDiagnoses: asArray(row.secondary_diagnoses),
    operations: asArray(row.operations),
    totalFee: row.total_fee != null ? String(row.total_fee) : null,
    codedBy: row.coded_by ? String(row.coded_by) : null,
    codedAt: row.coded_at ? String(row.coded_at) : null,
    defects: asArray(row.defects) as unknown as FrontPageDefect[],
    qualityScore: row.quality_score != null ? Number(row.quality_score) : null,
    archivedBy: row.archived_by ? String(row.archived_by) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const REVIEW_COLS = `
  id, front_page_id, reviewer_id, decision, defects, comment,
  signature_at, prev_hash, cur_hash, created_at
`;

function mapReview(row: Record<string, unknown>): FrontPageReview {
  return {
    id: String(row.id),
    frontPageId: String(row.front_page_id),
    reviewerId: String(row.reviewer_id),
    decision: row.decision as ReviewDecision,
    defects: asArray(row.defects) as unknown as FrontPageDefect[],
    comment: row.comment ? String(row.comment) : null,
    signatureAt: String(row.signature_at),
    prevHash: row.prev_hash ? String(row.prev_hash) : null,
    curHash: String(row.cur_hash),
    createdAt: String(row.created_at),
  };
}

/* --------------------------- 幂等汇聚创建 ------------------------------ */

export interface FrontPageCreateInput {
  visitId: string;
  patientId: string;
  department: string;
  admitAt?: string | null;
  dischargeAt?: string | null;
  ward?: string | null;
  bedNo?: string | null;
  primaryDiagnosis?: string | null;
  secondaryDiagnoses?: Array<Record<string, unknown>>;
  operations?: Array<Record<string, unknown>>;
  totalFee?: number | string | null;
  defects?: FrontPageDefect[];
}

/**
 * 幂等创建首页（ON CONFLICT (visit_id) DO NOTHING）。
 * 并发对同一出院就诊汇聚：只有一个事务能 INSERT，其余冲突后回查既有行，
 * 保证一个出院就诊只生成一份首页。返回 { page, created }。
 */
export async function upsertFrontPage(
  input: FrontPageCreateInput,
  tx: DbExecutor,
): Promise<{ page: FrontPage; created: boolean }> {
  const inserted = await tx`
    INSERT INTO clinical.medical_record_front_pages (
      visit_id, patient_id, department, admit_at, discharge_at, ward, bed_no,
      primary_diagnosis, secondary_diagnoses, operations, total_fee, defects
    ) VALUES (
      ${input.visitId}, ${input.patientId}, ${input.department},
      ${input.admitAt ?? null}, ${input.dischargeAt ?? null},
      ${input.ward ?? null}, ${input.bedNo ?? null},
      ${input.primaryDiagnosis ?? null},
      ${tx.json(toJson(input.secondaryDiagnoses ?? []))},
      ${tx.json(toJson(input.operations ?? []))},
      ${input.totalFee ?? null},
      ${tx.json(toJson(input.defects ?? []))}
    )
    ON CONFLICT (visit_id) DO NOTHING
    RETURNING ${tx.unsafe(PAGE_COLS)}
  `;
  if (inserted.length > 0) {
    return { page: mapPage(inserted[0] as Record<string, unknown>), created: true };
  }
  // 并发/重复汇聚：回查既有首页（不覆盖编码/质控进度）
  const existing = await tx`
    SELECT ${tx.unsafe(PAGE_COLS)} FROM clinical.medical_record_front_pages
    WHERE visit_id = ${input.visitId}
  `;
  return { page: mapPage(existing[0] as Record<string, unknown>), created: false };
}

/* ------------------------------- 查询 -------------------------------- */

export async function getFrontPageById(id: string, sql?: DbExecutor): Promise<FrontPage | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(PAGE_COLS)} FROM clinical.medical_record_front_pages WHERE id = ${id}
  `;
  return rows.length > 0 ? mapPage(rows[0] as Record<string, unknown>) : null;
}

export async function getFrontPageByVisit(visitId: string, sql?: DbExecutor): Promise<FrontPage | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(PAGE_COLS)} FROM clinical.medical_record_front_pages WHERE visit_id = ${visitId}
  `;
  return rows.length > 0 ? mapPage(rows[0] as Record<string, unknown>) : null;
}

export interface FrontPageQueueRow {
  pageId: string;
  visitId: string;
  visitNo: string;
  patientId: string;
  mrn: string;
  patientName: string;
  department: string;
  status: FrontPageStatus;
  version: number;
  primaryDiagnosis: string | null;
  updatedAt: string;
}

/** 队列查询：待编码(draft/coding) / 待质控归档(qc) / 全部未归档。DataScope 在聚合器过滤。 */
export async function listFrontPages(
  statuses: FrontPageStatus[],
  sql?: DbExecutor,
): Promise<FrontPageQueueRow[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT fp.id AS page_id, fp.visit_id, v.visit_no, fp.patient_id,
      p.mrn, p.name_masked, fp.department, fp.status, fp.version,
      fp.primary_diagnosis, fp.updated_at
    FROM clinical.medical_record_front_pages fp
    JOIN clinical.visits v ON v.id = fp.visit_id
    JOIN clinical.patients p ON p.id = fp.patient_id
    WHERE fp.status IN ${db(statuses)}
    ORDER BY fp.updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    pageId: String(r.page_id),
    visitId: String(r.visit_id),
    visitNo: String(r.visit_no),
    patientId: String(r.patient_id),
    mrn: String(r.mrn),
    patientName: String(r.name_masked),
    department: String(r.department),
    status: r.status as FrontPageStatus,
    version: Number(r.version),
    primaryDiagnosis: r.primary_diagnosis ? String(r.primary_diagnosis) : null,
    updatedAt: String(r.updated_at),
  }));
}

/* --------------------------- 条件式状态推进 ---------------------------- */

export interface TransitionPatch {
  primaryDiagnosis?: string | null;
  primaryDiagnosisCode?: string | null;
  secondaryDiagnoses?: Array<Record<string, unknown>>;
  operations?: Array<Record<string, unknown>>;
  totalFee?: number | string | null;
  defects?: FrontPageDefect[];
  qualityScore?: number | null;
  codedBy?: string;
  codedAt?: string;
  archivedBy?: string;
  archivedAt?: string;
}

/**
 * 条件式状态推进：行锁 + 版本号乐观锁 + 源状态白名单。
 * 成功返回更新后的首页；0 行（版本冲突 / 状态非法）返回 null，上层抛 409。
 * FOR UPDATE 锁定行，避免并发重复推进。
 */
export async function transitionFrontPage(
  id: string,
  expectedVersion: number,
  fromStatuses: FrontPageStatus[],
  toStatus: FrontPageStatus,
  patch: TransitionPatch,
  tx: DbExecutor,
): Promise<FrontPage | null> {
  // 先锁行
  const locked = await tx`
    SELECT ${tx.unsafe(PAGE_COLS)} FROM clinical.medical_record_front_pages
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapPage(locked[0] as Record<string, unknown>);
  if (current.version !== expectedVersion) return null;
  if (!fromStatuses.includes(current.status)) return null;

  const sets: string[] = ['version = version + 1'];
  const values: unknown[] = [];
  let vi = 0;
  const next = (val: unknown): string => {
    vi += 1;
    values.push(val);
    return `$${vi}`;
  };
  sets.push(`status = ${next(toStatus)}`);

  if (patch.primaryDiagnosis !== undefined) sets.push(`primary_diagnosis = ${next(patch.primaryDiagnosis)}`);
  if (patch.primaryDiagnosisCode !== undefined) sets.push(`primary_diagnosis_code = ${next(patch.primaryDiagnosisCode)}`);
  if (patch.secondaryDiagnoses !== undefined) sets.push(`secondary_diagnoses = ${next(tx.json(toJson(patch.secondaryDiagnoses)))}::jsonb`);
  if (patch.operations !== undefined) sets.push(`operations = ${next(tx.json(toJson(patch.operations)))}::jsonb`);
  if (patch.totalFee !== undefined) sets.push(`total_fee = ${next(patch.totalFee)}`);
  if (patch.defects !== undefined) sets.push(`defects = ${next(tx.json(toJson(patch.defects)))}::jsonb`);
  if (patch.qualityScore !== undefined) sets.push(`quality_score = ${next(patch.qualityScore)}`);
  if (patch.codedBy !== undefined) sets.push(`coded_by = ${next(patch.codedBy)}`);
  if (patch.codedAt !== undefined) sets.push(`coded_at = ${next(patch.codedAt)}`);
  if (patch.archivedBy !== undefined) sets.push(`archived_by = ${next(patch.archivedBy)}`);
  if (patch.archivedAt !== undefined) sets.push(`archived_at = ${next(patch.archivedAt)}`);

  const idParam = next(id);
  const rows = await tx.unsafe(
    `UPDATE clinical.medical_record_front_pages SET ${sets.join(', ')}
     WHERE id = ${idParam}
     RETURNING ${PAGE_COLS}`,
    values,
  );
  return rows.length > 0 ? mapPage(rows[0] as Record<string, unknown>) : null;
}

/* --------------------------- 质控签名留痕 ------------------------------ */

function signHash(prevHash: string, payload: Record<string, unknown>): string {
  return createHash('sha256')
    .update(prevHash + JSON.stringify(toJson(payload)))
    .digest('hex');
}

export interface ReviewCreateInput {
  frontPageId: string;
  reviewerId: string;
  decision: ReviewDecision;
  defects?: FrontPageDefect[];
  comment?: string | null;
  signatureAt?: string;
}

/**
 * 写入一条质控签名留痕，并链接业务级哈希链。
 * 必须在事务内调用（与状态推进同提交）。
 */
export async function insertFrontPageReview(
  input: ReviewCreateInput,
  tx: DbExecutor,
): Promise<FrontPageReview> {
  // 锁链头行，取前驱 cur_hash
  const head = await tx`
    SELECT cur_hash FROM clinical.front_page_reviews
    WHERE front_page_id = ${input.frontPageId}
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    FOR UPDATE
  `;
  const prevHash = head.length > 0 ? String((head[0] as Record<string, unknown>).cur_hash) : 'GENESIS';
  const signatureAt = input.signatureAt ?? new Date().toISOString();
  const defects = input.defects ?? [];
  const curHash = signHash(prevHash, {
    frontPageId: input.frontPageId,
    reviewerId: input.reviewerId,
    decision: input.decision,
    defects,
    signatureAt,
  });

  const rows = await tx`
    INSERT INTO clinical.front_page_reviews (
      front_page_id, reviewer_id, decision, defects, comment, signature_at, prev_hash, cur_hash
    ) VALUES (
      ${input.frontPageId}, ${input.reviewerId}, ${input.decision},
      ${tx.json(toJson(defects))}, ${input.comment ?? null}, ${signatureAt},
      ${prevHash}, ${curHash}
    )
    RETURNING ${tx.unsafe(REVIEW_COLS)}
  `;
  return mapReview(rows[0] as Record<string, unknown>);
}

/** 按首页列全部质控签名留痕（时间正序，还原签名链）。 */
export async function listReviewsByFrontPage(
  frontPageId: string,
  sql?: DbExecutor,
): Promise<FrontPageReview[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(REVIEW_COLS)} FROM clinical.front_page_reviews
    WHERE front_page_id = ${frontPageId} ORDER BY created_at ASC, id ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapReview);
}
