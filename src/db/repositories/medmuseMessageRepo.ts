/**
 * 健澜科技数智医院智能体 - MEDMUSE 消息 Repository
 *
 * clinical.medmuse_messages 表读写：
 *   - insertMessage   写入一条消息（user/agent/tool）
 *   - listBySession   按会话拉取历史（升序，最近优先分页）
 *   - markRead        将会话内 agent/tool 消息批量标记已读
 *
 * 演示模式（DEMO_MODE=1/true）：不连 PostgreSQL，走进程内内存 Map 兜底，
 * 重启即失效，仅用于无 DB 演示，绝不抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../pool.js';
import { toJson } from './helpers.js';

export type MedmuseMessageRole = 'user' | 'agent' | 'tool';
export type MedmuseConfidence = 'high' | 'medium' | 'low';

/** 前端约定的默认免责声明（与表默认值一致） */
export const MEDMUSE_DEFAULT_DISCLAIMER =
  '本建议由 AI 生成，不构成诊疗依据，最终决策由执业医师做出。';

/** 领域对象（camelCase） */
export interface MedmuseMessage {
  id: string;
  sessionId: string;
  role: MedmuseMessageRole;
  content: string;
  toolCalls: unknown;
  toolResult: unknown;
  confidence: MedmuseConfidence;
  disclaimer: string;
  systemPromptVersion: string;
  idempotencyKey: string | null;
  readAt: string | null;
  createdAt: string;
}

/** 写入入参（未提供的字段由 normalizeMessageInput 补默认值） */
export interface MedmuseMessageInput {
  sessionId: string;
  role: MedmuseMessageRole;
  content: string;
  toolCalls?: unknown;
  toolResult?: unknown;
  confidence?: MedmuseConfidence;
  disclaimer?: string;
  systemPromptVersion?: string;
  idempotencyKey?: string | null;
}

// ============================================================================
// 纯函数（可单测，无副作用）
// ============================================================================

/** 是否为无 DB 演示模式 */
export function isDemoMessageMode(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 补默认值：content 空串兜底、toolCalls=[]、toolResult=null、confidence=medium 等 */
export function normalizeMessageInput(input: MedmuseMessageInput): Required<Omit<MedmuseMessageInput, 'id'>> & { idempotencyKey: string | null } {
  return {
    sessionId: input.sessionId,
    role: input.role,
    content: input.content ?? '',
    toolCalls: input.toolCalls ?? [],
    toolResult: input.toolResult ?? null,
    confidence: input.confidence ?? 'medium',
    disclaimer: input.disclaimer ?? MEDMUSE_DEFAULT_DISCLAIMER,
    systemPromptVersion: input.systemPromptVersion ?? '1.0',
    idempotencyKey: input.idempotencyKey ?? null,
  };
}

/** 蛇形行 → camelCase 领域对象（PG RETURNING 行 / 内存行通用） */
export function mapMessageRow(row: Record<string, unknown>): MedmuseMessage {
  return {
    id: String(row.id),
    sessionId: String(row.session_id ?? row.sessionId ?? ''),
    role: (row.role ?? 'user') as MedmuseMessageRole,
    content: row.content != null ? String(row.content) : '',
    toolCalls: row.tool_calls ?? row.toolCalls ?? [],
    toolResult: row.tool_result ?? row.toolResult ?? null,
    confidence: (row.confidence ?? 'medium') as MedmuseConfidence,
    disclaimer: row.disclaimer ? String(row.disclaimer) : MEDMUSE_DEFAULT_DISCLAIMER,
    systemPromptVersion: row.system_prompt_version ? String(row.system_prompt_version) : '1.0',
    idempotencyKey: row.idempotency_key != null ? String(row.idempotency_key) : null,
    readAt: row.read_at != null ? String(row.read_at) : (row.readAt != null ? String(row.readAt) : null),
    createdAt: row.created_at != null ? String(row.created_at) : String(row.createdAt ?? new Date().toISOString()),
  };
}

/**
 * 领域对象 → 前端 wire 视图。
 * 前端约定 agent 角色展示为 assistant（user/tool 保持不变）。
 */
export interface MedmuseMessageView {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls: unknown;
  confidence: MedmuseConfidence | null;
  disclaimer: string | null;
  createdAt: string;
}

export function toMessageView(m: MedmuseMessage): MedmuseMessageView {
  return {
    id: m.id,
    sessionId: m.sessionId,
    role: m.role === 'agent' ? 'assistant' : m.role,
    content: m.content,
    toolCalls: m.toolCalls,
    confidence: m.confidence,
    disclaimer: m.disclaimer,
    createdAt: m.createdAt,
  };
}

// ============================================================================
// DEMO 内存兜底（仅 isDemoMessageMode() 时启用）
// ============================================================================

const demoStore = new Map<string, MedmuseMessage[]>();

/** 测试专用：清空内存兜底 */
export function _resetMedmuseMessageStoreForTest(): void {
  demoStore.clear();
}

function genDemoId(): string {
  return `demo_msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// 写：insertMessage
// ============================================================================

export async function insertMessage(input: MedmuseMessageInput): Promise<MedmuseMessage> {
  const normalized = normalizeMessageInput(input);

  if (isDemoMessageMode()) {
    const row: MedmuseMessage = {
      id: genDemoId(),
      sessionId: normalized.sessionId,
      role: normalized.role,
      content: normalized.content,
      toolCalls: normalized.toolCalls,
      toolResult: normalized.toolResult,
      confidence: normalized.confidence,
      disclaimer: normalized.disclaimer,
      systemPromptVersion: normalized.systemPromptVersion,
      idempotencyKey: normalized.idempotencyKey,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    const list = demoStore.get(row.sessionId) ?? [];
    list.push(row);
    demoStore.set(row.sessionId, list);
    return row;
  }

  const db = getDb();
  const rows = await db<Record<string, unknown>[]>`
    INSERT INTO clinical.medmuse_messages
      (session_id, role, content, tool_calls, tool_result, confidence, disclaimer, system_prompt_version, idempotency_key)
    VALUES (
      ${normalized.sessionId},
      ${normalized.role},
      ${normalized.content},
      ${db.json(toJson(normalized.toolCalls))},
      ${normalized.toolResult == null ? null : db.json(toJson(normalized.toolResult))},
      ${normalized.confidence},
      ${normalized.disclaimer},
      ${normalized.systemPromptVersion},
      ${normalized.idempotencyKey}
    )
    RETURNING *
  `;
  return mapMessageRow(rows[0]);
}

// ============================================================================
// 读：listBySession（升序）
// ============================================================================

export async function listBySession(sessionId: string, limit = 100): Promise<MedmuseMessage[]> {
  if (isDemoMessageMode()) {
    const list = demoStore.get(sessionId) ?? [];
    return list.slice(0, limit).map((m) => ({ ...m }));
  }
  const rows = await getDb()<Record<string, unknown>[]>`
    SELECT * FROM clinical.medmuse_messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
  return rows.map(mapMessageRow);
}

// ============================================================================
// 标记已读：会话内 agent/tool 消息批量置 read_at
// ============================================================================

export async function markRead(sessionId: string): Promise<number> {
  if (isDemoMessageMode()) {
    // 内存兜底无需持久化已读位，直接返回 0
    return 0;
  }
  const result = await getDb()`
    UPDATE clinical.medmuse_messages
    SET read_at = now()
    WHERE session_id = ${sessionId}
      AND role IN ('agent', 'tool')
      AND read_at IS NULL
  `;
  // postgres.js UPDATE 返回 { count }
  return (result as unknown as { count?: number }).count ?? 0;
}
