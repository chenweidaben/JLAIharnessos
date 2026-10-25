/**
 * consult-agent M86 仓储实现（契约 §12 仓储 / §13 迁移 380–385）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 实现核心包 ConsultAgentPort 全部 13 个读写方法：
 *  - DEMO_MODE=1/true：模块级单例 SessionRuntime 进程内 Map 兜底，跨请求保持
 *    线程 / 消息 / 草稿 / 审计 / 画像 / 文档，不连库、不抛错；getProfile 不存在
 *    时返回空白画像；
 *  - 非 DEMO：按 consult schema 六表（380 threads / 381 messages / 382 documents /
 *    383 diagnosis_prescription_drafts / 384 audit_trail / 385 profile_memory）
 *    写 postgres 查询，mapRow 蛇形转驼峰。非 DEMO 路径本机不执行，仅保证编译通过。
 */

import {
  type ConsultAgentPort,
  type ConsultAuditEntry,
  type ConsultDocument,
  type ConsultDraft,
  type ConsultMessage,
  type ConsultProfileMemory,
  type ConsultThread,
  createDemoRuntime,
  createProfileMemory,
  type SessionRuntime,
} from '../../core/agent/consult/index.js';
import { getDb, type Sql } from '../pool.js';
import { toJson } from './helpers.js';

/** 是否为无 DB 演示模式（1 / true 开启） */
function isConsultDemoMode(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/**
 * 把领域对象包装为 postgres.js JSON 参数。
 * 边界处统一放宽类型（与 pool.ts 同款处理），核心域模型自身保持强类型。
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
function toJsonParam(db: Sql, value: unknown): any {
  return db.json(toJson(value));
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */

// ============================================================================
// DEMO 进程内兜底（模块级单例，跨请求保持会话 / 消息 / 草稿 / 审计 / 画像）
// ============================================================================

const demoRuntime: SessionRuntime = createDemoRuntime();

class DemoConsultRepo implements ConsultAgentPort {
  constructor(private readonly runtime: SessionRuntime) {}

  findThread(threadId: string, userId: string): Promise<ConsultThread | null> {
    return this.runtime.findThread(threadId, userId);
  }

  listThreads(userId: string): Promise<ConsultThread[]> {
    return this.runtime.listThreads(userId);
  }

  saveThread(thread: ConsultThread): Promise<ConsultThread> {
    return this.runtime.saveThread(thread);
  }

  listMessages(threadId: string): Promise<ConsultMessage[]> {
    return this.runtime.listMessages(threadId);
  }

  saveMessage(message: ConsultMessage): Promise<ConsultMessage> {
    return this.runtime.saveMessage(message);
  }

  listDrafts(threadId: string, kind: ConsultDraft['kind']): Promise<ConsultDraft[]> {
    return this.runtime.listDrafts(threadId, kind);
  }

  saveDraft(draft: ConsultDraft): Promise<ConsultDraft> {
    return this.runtime.saveDraft(draft);
  }

  listAudit(threadId: string): Promise<ConsultAuditEntry[]> {
    return this.runtime.listAudit(threadId);
  }

  saveAudit(entry: ConsultAuditEntry): Promise<void> {
    return this.runtime.saveAudit(entry);
  }

  getProfile(userId: string): Promise<ConsultProfileMemory> {
    return this.runtime.getProfile(userId);
  }

  saveProfile(profile: ConsultProfileMemory): Promise<ConsultProfileMemory> {
    return this.runtime.saveProfile(profile);
  }

  listDocuments(threadId: string): Promise<ConsultDocument[]> {
    return this.runtime.listDocuments(threadId);
  }

  saveDocument(document: ConsultDocument): Promise<ConsultDocument> {
    return this.runtime.saveDocument(document);
  }
}

// ============================================================================
// 非 DEMO：postgres 行映射（蛇形 -> 驼峰，JSONB 列反序列化）
// ============================================================================

function mapThreadRow(row: Record<string, unknown>): ConsultThread {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    patientId: (row.patient_id as string | null) ?? null,
    title: (row.title as string) ?? '',
    status: row.status as ConsultThread['status'],
    intent: row.intent as ConsultThread['intent'],
    safetyLevel: row.safety_level as ConsultThread['safetyLevel'],
    currentRole: (row.current_role as ConsultThread['currentRole']) ?? null,
    meta: (row.meta as Record<string, unknown>) ?? {},
    closedAt: (row.closed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMessageRow(row: Record<string, unknown>): ConsultMessage {
  return {
    id: row.id as string,
    threadId: row.thread_id as string,
    role: row.role as ConsultMessage['role'],
    content: (row.content as string) ?? '',
    intent: (row.intent as ConsultMessage['intent']) ?? null,
    roleKind: (row.role_kind as ConsultMessage['roleKind']) ?? null,
    toolCalls: (row.tool_calls as ConsultMessage['toolCalls']) ?? null,
    toolName: (row.tool_name as string | null) ?? null,
    safetyLevel: row.safety_level as ConsultMessage['safetyLevel'],
    disclaimer: (row.disclaimer as string) ?? '',
    traceId: (row.trace_id as string) ?? '',
    createdAt: row.created_at as string,
  };
}

function mapDraftRow(row: Record<string, unknown>): ConsultDraft {
  return {
    id: row.id as string,
    threadId: row.thread_id as string,
    kind: row.kind as ConsultDraft['kind'],
    title: (row.title as string) ?? '',
    summary: (row.summary as string) ?? '',
    content: (row.content as string) ?? '',
    evidence: (row.evidence as ConsultDraft['evidence']) ?? [],
    needsPhysicianReview: true,
    isOutOfHospitalPrescription: false,
    status: 'pending_review',
    draftHash: (row.draft_hash as string) ?? '',
    reviewerId: (row.reviewer_id as string | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    reviewNote: (row.review_note as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapAuditRow(row: Record<string, unknown>): ConsultAuditEntry {
  return {
    id: row.id as string,
    threadId: row.thread_id as string,
    actorRole: row.actor_role as ConsultAuditEntry['actorRole'],
    action: (row.action as string) ?? '',
    toolName: (row.tool_name as string | null) ?? null,
    toolStatus: (row.tool_status as ConsultAuditEntry['toolStatus']) ?? null,
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
    evidenceCount: row.evidence_count != null ? Number(row.evidence_count) : null,
    errorClass: (row.error_class as string | null) ?? null,
    traceId: (row.trace_id as string) ?? '',
    detail: (row.detail as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

function mapProfileRow(row: Record<string, unknown>): ConsultProfileMemory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    threadId: (row.thread_id as string | null) ?? null,
    facts: (row.facts as ConsultProfileMemory['facts']) ?? [],
    updatedAt: row.updated_at as string,
  };
}

function mapDocumentRow(row: Record<string, unknown>): ConsultDocument {
  return {
    id: row.id as string,
    threadId: row.thread_id as string,
    messageId: (row.message_id as string | null) ?? null,
    fileName: (row.file_name as string) ?? '',
    mimeType: (row.mime_type as string) ?? '',
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    evidenceSummary: (row.evidence_summary as string | null) ?? null,
    extractedEvidence: (row.extracted_evidence as ConsultDocument['extractedEvidence']) ?? [],
    createdAt: row.created_at as string,
  };
}

/** 非 DEMO 咨询仓储：consult schema 六表读写（迁移 380–385） */
class PostgresConsultRepo implements ConsultAgentPort {
  async findThread(threadId: string, userId: string): Promise<ConsultThread | null> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM consult.threads
      WHERE id = ${threadId} AND user_id = ${userId}
      LIMIT 1
    `;
    return rows.length ? mapThreadRow(rows[0]) : null;
  }

  async listThreads(userId: string): Promise<ConsultThread[]> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM consult.threads
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return rows.map(mapThreadRow);
  }

  async saveThread(thread: ConsultThread): Promise<ConsultThread> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      INSERT INTO consult.threads
        (id, user_id, patient_id, title, status, intent, safety_level, current_role,
         meta, closed_at, created_at, updated_at)
      VALUES (
        ${thread.id}, ${thread.userId}, ${thread.patientId}, ${thread.title}, ${thread.status},
        ${thread.intent}, ${thread.safetyLevel}, ${thread.currentRole},
        ${toJsonParam(db, thread.meta)},
        ${thread.closedAt}, ${thread.createdAt}, ${thread.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        patient_id = EXCLUDED.patient_id,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        intent = EXCLUDED.intent,
        safety_level = EXCLUDED.safety_level,
        current_role = EXCLUDED.current_role,
        meta = EXCLUDED.meta,
        closed_at = EXCLUDED.closed_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;
    return mapThreadRow(rows[0]);
  }

  async listMessages(threadId: string): Promise<ConsultMessage[]> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM consult.messages
      WHERE thread_id = ${threadId}
      ORDER BY created_at ASC
    `;
    return rows.map(mapMessageRow);
  }

  async saveMessage(message: ConsultMessage): Promise<ConsultMessage> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      INSERT INTO consult.messages
        (id, thread_id, role, content, intent, role_kind, tool_calls, tool_name,
         safety_level, disclaimer, trace_id, created_at)
      VALUES (
        ${message.id}, ${message.threadId}, ${message.role}, ${message.content},
        ${message.intent}, ${message.roleKind},
        ${toJsonParam(db, message.toolCalls ?? [])},
        ${message.toolName}, ${message.safetyLevel}, ${message.disclaimer},
        ${message.traceId}, ${message.createdAt}
      )
      RETURNING *
    `;
    return mapMessageRow(rows[0]);
  }

  async listDrafts(threadId: string, kind: ConsultDraft['kind']): Promise<ConsultDraft[]> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM consult.diagnosis_prescription_drafts
      WHERE thread_id = ${threadId} AND kind = ${kind}
      ORDER BY created_at DESC
    `;
    return rows.map(mapDraftRow);
  }

  async saveDraft(draft: ConsultDraft): Promise<ConsultDraft> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      INSERT INTO consult.diagnosis_prescription_drafts
        (id, thread_id, kind, title, summary, content, evidence,
         needs_physician_review, is_out_of_hospital_prescription, status, draft_hash,
         reviewer_id, reviewed_at, review_note, created_at, updated_at)
      VALUES (
        ${draft.id}, ${draft.threadId}, ${draft.kind}, ${draft.title}, ${draft.summary},
        ${draft.content},
        ${toJsonParam(db, draft.evidence)},
        ${draft.needsPhysicianReview}, ${draft.isOutOfHospitalPrescription}, ${draft.status},
        ${draft.draftHash}, ${draft.reviewerId}, ${draft.reviewedAt}, ${draft.reviewNote},
        ${draft.createdAt}, ${draft.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        content = EXCLUDED.content,
        evidence = EXCLUDED.evidence,
        draft_hash = EXCLUDED.draft_hash,
        reviewer_id = EXCLUDED.reviewer_id,
        reviewed_at = EXCLUDED.reviewed_at,
        review_note = EXCLUDED.review_note,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;
    return mapDraftRow(rows[0]);
  }

  async listAudit(threadId: string): Promise<ConsultAuditEntry[]> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM consult.audit_trail
      WHERE thread_id = ${threadId}
      ORDER BY created_at ASC
    `;
    return rows.map(mapAuditRow);
  }

  async saveAudit(entry: ConsultAuditEntry): Promise<void> {
    const db = getDb();
    await db`
      INSERT INTO consult.audit_trail
        (id, thread_id, actor_role, action, tool_name, tool_status, duration_ms,
         evidence_count, error_class, trace_id, detail, created_at)
      VALUES (
        ${entry.id}, ${entry.threadId}, ${entry.actorRole}, ${entry.action},
        ${entry.toolName}, ${entry.toolStatus}, ${entry.durationMs}, ${entry.evidenceCount},
        ${entry.errorClass}, ${entry.traceId},
        ${toJsonParam(db, entry.detail)}, ${entry.createdAt}
      )
    `;
  }

  async getProfile(userId: string): Promise<ConsultProfileMemory> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM consult.profile_memory
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return rows.length ? mapProfileRow(rows[0]) : createProfileMemory(userId);
  }

  async saveProfile(profile: ConsultProfileMemory): Promise<ConsultProfileMemory> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      INSERT INTO consult.profile_memory
        (id, user_id, thread_id, facts, updated_at)
      VALUES (
        ${profile.id}, ${profile.userId}, ${profile.threadId},
        ${toJsonParam(db, profile.facts)}, ${profile.updatedAt}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        thread_id = EXCLUDED.thread_id,
        facts = EXCLUDED.facts,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;
    return mapProfileRow(rows[0]);
  }

  async listDocuments(threadId: string): Promise<ConsultDocument[]> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      SELECT * FROM consult.documents
      WHERE thread_id = ${threadId}
      ORDER BY created_at ASC
    `;
    return rows.map(mapDocumentRow);
  }

  async saveDocument(document: ConsultDocument): Promise<ConsultDocument> {
    const db = getDb();
    const rows = await db<Record<string, unknown>[]>`
      INSERT INTO consult.documents
        (id, thread_id, message_id, file_name, mime_type, size_bytes,
         evidence_summary, extracted_evidence, created_at)
      VALUES (
        ${document.id}, ${document.threadId}, ${document.messageId}, ${document.fileName},
        ${document.mimeType}, ${document.sizeBytes}, ${document.evidenceSummary},
        ${toJsonParam(db, document.extractedEvidence)}, ${document.createdAt}
      )
      RETURNING *
    `;
    return mapDocumentRow(rows[0]);
  }
}

/**
 * 创建咨询智能体仓储实例。
 * DEMO_MODE 走进程内单例兜底；非 DEMO 返回 postgres 实现。
 */
export function createConsultAgentRepo(): ConsultAgentPort {
  if (isConsultDemoMode()) {
    return new DemoConsultRepo(demoRuntime);
  }
  return new PostgresConsultRepo();
}
