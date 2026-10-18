/**
 * 健澜科技 jlmedaios - 电子病历模板 Repository（EMR Template v2）
 *
 * clinical.emr_template / clinical.emr_template_reviews 读写。
 *
 * 并发与一致性：
 *  - 条件式状态推进：UPDATE ... WHERE version=$expected AND status IN (...)，
 *    0 行即乐观锁冲突 / 非法流转，上层抛 409；
 *  - FOR UPDATE 锁行避免并发重复推进；
 *  - 审核留痕：业务级签名哈希链（prev_hash/cur_hash sha256）在事务内逐行链接，
 *    范式对齐 clinical.front_page_reviews。
 *
 * 分层纪律：Repo 层不抛 HTTP 错误，guarded write 0 行返回 null，由上层 aggregator
 * 抛业务错误类（409 Conflict）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { createHash, randomUUID } from 'node:crypto';
import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type TemplateScope = 'national' | 'hospital' | 'department' | 'personal';
export type TemplateStatus = 'draft' | 'pending_review' | 'published' | 'deprecated';
export type TemplateFieldType = 'text' | 'select' | 'date' | 'number' | 'table';
export type TemplateReviewAction = 'submit' | 'approve' | 'return' | 'deprecate';

export interface TemplateField {
  fieldName: string;
  fieldType: TemplateFieldType;
  required: boolean;
  options?: string[];
  placeholder: string;
}

export interface EmrTemplate {
  id: string;
  name: string;
  scope: TemplateScope;
  departmentId: string | null;
  hospitalId: string | null;
  userId: string | null;
  parentId: string | null;
  recordType: string;
  content: string;
  fields: TemplateField[];
  status: TemplateStatus;
  version: number;
  dueRule: string | null;
  responsibleRole: string | null;
  triggerEvent: string | null;
  deprecatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmrTemplateReview {
  id: string;
  templateId: string;
  reviewerId: string | null;
  action: TemplateReviewAction;
  comment: string | null;
  snapshotVersion: number | null;
  snapshotFields: TemplateField[];
  prevHash: string | null;
  curHash: string;
  createdAt: string;
}

const TEMPLATE_COLS = `
  id, name, scope, department_id, hospital_id, user_id, parent_id,
  record_type, content, fields, status, version,
  due_rule, responsible_role, trigger_event, deprecated_at, created_at, updated_at
`;

function asFields(v: unknown): TemplateField[] {
  if (Array.isArray(v)) return v as TemplateField[];
  if (typeof v === 'string' && v.trim()) {
    try {
      const p: unknown = JSON.parse(v);
      return Array.isArray(p) ? (p as TemplateField[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapTemplate(row: Record<string, unknown>): EmrTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    scope: (row.scope as TemplateScope) ?? 'hospital',
    departmentId: row.department_id ? String(row.department_id) : null,
    hospitalId: row.hospital_id ? String(row.hospital_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    parentId: row.parent_id ? String(row.parent_id) : null,
    recordType: String(row.record_type ?? ''),
    content: String(row.content ?? ''),
    fields: asFields(row.fields),
    status: (row.status as TemplateStatus) ?? 'published',
    version: Number(row.version ?? 1),
    dueRule: row.due_rule ? String(row.due_rule) : null,
    responsibleRole: row.responsible_role ? String(row.responsible_role) : null,
    triggerEvent: row.trigger_event ? String(row.trigger_event) : null,
    deprecatedAt: row.deprecated_at ? String(row.deprecated_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

const REVIEW_COLS = `
  id, template_id, reviewer_id, action, comment,
  snapshot_version, snapshot_fields, prev_hash, cur_hash, created_at
`;

function mapReview(row: Record<string, unknown>): EmrTemplateReview {
  return {
    id: String(row.id),
    templateId: String(row.template_id),
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : null,
    action: row.action as TemplateReviewAction,
    comment: row.comment ? String(row.comment) : null,
    snapshotVersion: row.snapshot_version != null ? Number(row.snapshot_version) : null,
    snapshotFields: asFields(row.snapshot_fields),
    prevHash: row.prev_hash ? String(row.prev_hash) : null,
    curHash: String(row.cur_hash),
    createdAt: String(row.created_at),
  };
}

/* ------------------------------- 创建 -------------------------------- */

export interface TemplateCreateInput {
  name: string;
  scope: TemplateScope;
  recordType: string;
  content: string;
  fields?: TemplateField[];
  status?: TemplateStatus;
  departmentId?: string | null;
  hospitalId?: string | null;
  userId?: string | null;
  parentId?: string | null;
  dueRule?: string | null;
  responsibleRole?: string | null;
  triggerEvent?: string | null;
  createdBy?: string | null;
}

/**
 * 创建一条模板。id 由应用层预生成 uuid；返回落库后的完整行。
 * 新建默认 version=1、status 走入参（L0 种子直接 published）。
 */
export async function createTemplate(
  input: TemplateCreateInput,
  sql?: DbExecutor,
): Promise<EmrTemplate> {
  const db = sql ?? getDb();
  const id = randomUUID();
  const rows = await db`
    INSERT INTO clinical.emr_template (
      id, name, scope, department_id, hospital_id, user_id, parent_id,
      record_type, content, fields, status, version,
      due_rule, responsible_role, trigger_event, created_by
    ) VALUES (
      ${id}, ${input.name}, ${input.scope},
      ${input.departmentId ?? null}, ${input.hospitalId ?? null}, ${input.userId ?? null},
      ${input.parentId ?? null},
      ${input.recordType}, ${input.content},
      ${db.json(toJson(input.fields ?? []))},
      ${input.status ?? 'published'}, 1,
      ${input.dueRule ?? null}, ${input.responsibleRole ?? null}, ${input.triggerEvent ?? null},
      ${input.createdBy ?? null}
    )
    RETURNING ${db.unsafe(TEMPLATE_COLS)}
  `;
  return mapTemplate(rows[0] as Record<string, unknown>);
}

/* ------------------------------- 查询 -------------------------------- */

export async function getTemplateById(id: string, sql?: DbExecutor): Promise<EmrTemplate | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(TEMPLATE_COLS)} FROM clinical.emr_template WHERE id = ${id}
  `;
  return rows.length > 0 ? mapTemplate(rows[0] as Record<string, unknown>) : null;
}

export interface ListPublishedTemplatesOpts {
  recordType?: string;
  scope?: TemplateScope;
  departmentId?: string;
  hospitalId?: string;
  userId?: string;
}

/**
 * 列出 published 模板（供 resolver 取全集）。
 * 不传 opts 时返回全部 published 行；调用方在内存中做四级继承解析（纯函数）。
 */
export async function listPublishedTemplates(
  opts: ListPublishedTemplatesOpts = {},
  sql?: DbExecutor,
): Promise<EmrTemplate[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(TEMPLATE_COLS)} FROM clinical.emr_template
    WHERE status = 'published'
      AND (${opts.recordType ?? ''} = '' OR record_type = ${opts.recordType ?? ''})
      AND (${opts.scope ?? ''} = '' OR scope = ${opts.scope ?? ''})
      AND (${opts.departmentId ?? ''} = '' OR department_id = ${opts.departmentId ?? ''})
      AND (${opts.hospitalId ?? ''} = '' OR hospital_id = ${opts.hospitalId ?? ''})
      AND (${opts.userId ?? ''} = '' OR user_id = ${opts.userId ?? ''})
    ORDER BY version DESC, updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapTemplate);
}

/* --------------------------- 条件式状态推进 ---------------------------- */

export interface TransitionPatch {
  name?: string;
  content?: string;
  fields?: TemplateField[];
  dueRule?: string | null;
  responsibleRole?: string | null;
  triggerEvent?: string | null;
  deprecatedAt?: string | null;
}

/**
 * 条件式状态推进：行锁 + 版本号乐观锁 + 源状态白名单。
 * 成功返回更新后的模板；0 行（版本冲突 / 状态非法 / 行不存在）返回 null，
 * 上层 aggregator 据此抛 409 Conflict。FOR UPDATE 锁定行避免并发重复发布。
 */
export async function transitionTemplateStatus(
  id: string,
  expectedVersion: number,
  fromStatuses: TemplateStatus[],
  toStatus: TemplateStatus,
  patch: TransitionPatch,
  tx: DbExecutor,
): Promise<EmrTemplate | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(TEMPLATE_COLS)} FROM clinical.emr_template
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapTemplate(locked[0] as Record<string, unknown>);
  if (current.version !== expectedVersion) return null;
  if (!fromStatuses.includes(current.status)) return null;

  const sets: string[] = ['version = version + 1', 'updated_at = now()'];
  const values: unknown[] = [];
  let vi = 0;
  const next = (val: unknown): string => {
    vi += 1;
    values.push(val);
    return `$${vi}`;
  };
  sets.push(`status = ${next(toStatus)}`);
  if (toStatus === 'deprecated') sets.push(`deprecated_at = ${next(new Date().toISOString())}`);

  if (patch.name !== undefined) sets.push(`name = ${next(patch.name)}`);
  if (patch.content !== undefined) sets.push(`content = ${next(patch.content)}`);
  if (patch.fields !== undefined) {
    sets.push(`fields = ${next(tx.json(toJson(patch.fields)))}::jsonb`);
  }
  if (patch.dueRule !== undefined) sets.push(`due_rule = ${next(patch.dueRule)}`);
  if (patch.responsibleRole !== undefined) sets.push(`responsible_role = ${next(patch.responsibleRole)}`);
  if (patch.triggerEvent !== undefined) sets.push(`trigger_event = ${next(patch.triggerEvent)}`);
  if (patch.deprecatedAt !== undefined) sets.push(`deprecated_at = ${next(patch.deprecatedAt)}`);

  const idParam = next(id);
  const rows = await tx.unsafe(
    `UPDATE clinical.emr_template SET ${sets.join(', ')}
     WHERE id = ${idParam}
     RETURNING ${TEMPLATE_COLS}`,
    values,
  );
  return rows.length > 0 ? mapTemplate(rows[0] as Record<string, unknown>) : null;
}

/* --------------------------- 审核留痕（哈希链） ------------------------- */

function signHash(prevHash: string, payload: Record<string, unknown>): string {
  return createHash('sha256')
    .update(prevHash + JSON.stringify(toJson(payload)))
    .digest('hex');
}

export interface ReviewCreateInput {
  templateId: string;
  reviewerId?: string | null;
  action: TemplateReviewAction;
  comment?: string | null;
  snapshotVersion?: number | null;
  snapshotFields?: TemplateField[];
}

/**
 * 写入一条模板审核留痕，并链接业务级哈希链。必须在事务内调用
 * （与 transitionTemplateStatus 同提交，保证状态与留痕原子一致）。
 */
export async function insertTemplateReview(
  input: ReviewCreateInput,
  tx: DbExecutor,
): Promise<EmrTemplateReview> {
  const head = await tx`
    SELECT cur_hash FROM clinical.emr_template_reviews
    WHERE template_id = ${input.templateId}
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    FOR UPDATE
  `;
  const prevHash = head.length > 0 ? String((head[0] as Record<string, unknown>).cur_hash) : 'GENESIS';
  const snapshotFields = input.snapshotFields ?? [];
  const curHash = signHash(prevHash, {
    templateId: input.templateId,
    reviewerId: input.reviewerId ?? null,
    action: input.action,
    comment: input.comment ?? null,
    snapshotVersion: input.snapshotVersion ?? null,
  });
  const id = randomUUID();
  const rows = await tx`
    INSERT INTO clinical.emr_template_reviews (
      id, template_id, reviewer_id, action, comment,
      snapshot_version, snapshot_fields, prev_hash, cur_hash
    ) VALUES (
      ${id}, ${input.templateId}, ${input.reviewerId ?? null}, ${input.action}, ${input.comment ?? null},
      ${input.snapshotVersion ?? null}, ${tx.json(toJson(snapshotFields))},
      ${prevHash}, ${curHash}
    )
    RETURNING ${tx.unsafe(REVIEW_COLS)}
  `;
  return mapReview(rows[0] as Record<string, unknown>);
}

/** 按模板列全部审核留痕（时间正序，还原哈希链）。 */
export async function listReviewsByTemplate(
  templateId: string,
  sql?: DbExecutor,
): Promise<EmrTemplateReview[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(REVIEW_COLS)} FROM clinical.emr_template_reviews
    WHERE template_id = ${templateId} ORDER BY created_at ASC, id ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapReview);
}
