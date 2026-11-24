/**
 * 健澜科技数智医院智能体 - 病历文书 Repository
 * clinical.medical_records 表 CRUD。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { dynamicSelect, QueryBuilder, toJson } from './helpers.js';

export type MedicalRecordType = 'outpatient' | 'admission' | 'progress' | 'operative' | 'discharge' | 'front_page';
export type MedicalRecordStatus = 'draft' | 'submitted' | 'reviewed' | 'signed' | 'archived' | 'returned';

export interface MedicalRecord {
  id: string; visitId: string; recordType: MedicalRecordType; title: string;
  content: Record<string, unknown>; plainText: string | null; authorId: string | null;
  aiGenerated: boolean; aiModel: string | null; status: MedicalRecordStatus;
  qualityScore: number | null; qualityIssues: Array<Record<string, unknown>>;
  signedAt: string | null; signedBy: string | null; version: number; createdAt: string; updatedAt: string;
}

export interface MedicalRecordCreateInput {
  visitId: string; recordType: MedicalRecordType; title: string;
  content: Record<string, unknown>; plainText?: string | null;
  authorId?: string | null; aiGenerated?: boolean; aiModel?: string | null;
}

const SELECT_COLS = `id, visit_id, record_type, title, content, plain_text, author_id, ai_generated, ai_model, status, quality_score, quality_issues, signed_at, signed_by, version, created_at, updated_at`;

function mapRow(row: Record<string, unknown>): MedicalRecord {
  return {
    id: String(row.id), visitId: String(row.visit_id), recordType: row.record_type as MedicalRecordType,
    title: String(row.title), content: (row.content as Record<string, unknown>) ?? {},
    plainText: row.plain_text ? String(row.plain_text) : null,
    authorId: row.author_id ? String(row.author_id) : null,
    aiGenerated: Boolean(row.ai_generated), aiModel: row.ai_model ? String(row.ai_model) : null,
    status: row.status as MedicalRecordStatus,
    qualityScore: row.quality_score !== null ? Number(row.quality_score) : null,
    qualityIssues: (row.quality_issues as Array<Record<string, unknown>>) ?? [],
    signedAt: row.signed_at ? String(row.signed_at) : null,
    signedBy: row.signed_by ? String(row.signed_by) : null,
    version: Number(row.version), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function createMedicalRecord(input: MedicalRecordCreateInput, sql?: DbExecutor): Promise<MedicalRecord> {
  const db = sql ?? getDb();
  const rows = await db`
    INSERT INTO clinical.medical_records (visit_id, record_type, title, content, plain_text, author_id, ai_generated, ai_model)
    VALUES (${input.visitId}, ${input.recordType}, ${input.title}, ${db.json(toJson(input.content))},
      ${input.plainText ?? null}, ${input.authorId ?? null}, ${input.aiGenerated ?? false}, ${input.aiModel ?? null})
    RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getMedicalRecordById(id: string, sql?: DbExecutor): Promise<MedicalRecord | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(SELECT_COLS)} FROM clinical.medical_records WHERE id = ${id} AND deleted_at IS NULL`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function getMedicalRecordsByVisit(
  visitId: string, options?: { recordType?: MedicalRecordType; limit?: number }, sql?: DbExecutor,
): Promise<MedicalRecord[]> {
  const db = sql ?? getDb();
  const qb = new QueryBuilder().where('visit_id = ?', visitId).whereRaw('deleted_at IS NULL');
  if (options?.recordType) qb.where('record_type = ?', options.recordType);
  const rows = await dynamicSelect<Record<string, unknown>>(db, SELECT_COLS, 'clinical.medical_records', qb, 'created_at DESC', options?.limit ?? 50);
  return rows.map(mapRow);
}

export async function updateMedicalRecordStatus(
  id: string, status: MedicalRecordStatus, signedBy?: string, sql?: DbExecutor,
): Promise<MedicalRecord | null> {
  const db = sql ?? getDb();
  const signedAt = status === 'signed' ? new Date().toISOString() : null;
  const rows = await db`
    UPDATE clinical.medical_records SET status = ${status},
      signed_at = COALESCE(signed_at, ${signedAt ?? null}),
      signed_by = COALESCE(signed_by, ${signedBy ?? null}), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** 待三级质控队列项（病历 + 就诊科室）。 */
export interface QcQueueRecord {
  recordId: string;
  department: string;
}

/**
 * 待质控病历队列（M2-B）：仅纳入 submitted / returned 状态、未软删病历，
 * 关联就诊取科室。deptName 为空时返回全量（全院数据范围），否则按科室过滤。
 */
export async function listPendingQcQueue(
  options: { deptName?: string | null },
  sql?: DbExecutor,
): Promise<QcQueueRecord[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT m.id AS record_id, v.department AS department
    FROM clinical.medical_records m
    JOIN clinical.visits v ON v.id = m.visit_id
    WHERE m.deleted_at IS NULL
      AND m.status IN ('submitted', 'returned')
      ${options.deptName ? db`AND v.department = ${options.deptName}` : db``}
    ORDER BY m.updated_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    recordId: String(r.record_id),
    department: String(r.department),
  }));
}

/** 更新病历正文内容（草稿保存），版本号 +1 */
export async function updateMedicalRecordContent(
  id: string,
  input: { content: Record<string, unknown>; plainText?: string | null },
  sql?: DbExecutor,
): Promise<MedicalRecord | null> {
  const db = sql ?? getDb();
  const rows = await db`
    UPDATE clinical.medical_records
    SET content = ${db.json(toJson(input.content))},
        plain_text = ${input.plainText ?? null},
        version = version + 1, updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL RETURNING ${db.unsafe(SELECT_COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}
