/**
 * MEDMUSE 数据访问层 - 会话/消息/审批/幂等键的持久化。
 *
 * 医疗安全：所有写操作走事务；幂等键表防重放；审批单带 15 分钟过期。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../../db/pool.js';

function db(): Sql {
  return getDb();
}

// ============================================================================
// 类型
// ============================================================================

export interface MedmuseAgentRow {
  id: string;
  role_code: string;
  user_id: string | null;
  name: string;
  system_prompt: string;
  system_prompt_version: string;
  model_provider: string;
  model_name: string;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface MedmuseSessionRow {
  id: string;
  agent_id: string;
  user_id: string;
  patient_id: string | null;
  title: string;
  last_active_at: string;
  created_at: string;
}

export interface MedmuseMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'agent' | 'tool';
  content: string;
  tool_calls: unknown;
  tool_result: unknown;
  confidence: 'high' | 'medium' | 'low';
  disclaimer: string;
  system_prompt_version: string;
  idempotency_key: string | null;
  created_at: string;
}

export interface MedmuseApprovalRow {
  id: string;
  message_id: string;
  action: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  risk_level: 'info' | 'warning' | 'critical';
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  expires_at: string;
  created_at: string;
}

export interface IdempotencyKeyRow {
  id: string;
  session_id: string;
  user_id: string;
  response: unknown;
  consumed_at: string | null;
  created_at: string;
}

// ============================================================================
// Agent
// ============================================================================

export async function getAgentByRole(roleCode: string): Promise<MedmuseAgentRow | null> {
  const rows = await db()<MedmuseAgentRow[]>`
    SELECT * FROM clinical.medmuse_agents
    WHERE role_code = ${roleCode} AND status = 'active'
    ORDER BY (user_id IS NULL) DESC, updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getAgentById(agentId: string): Promise<MedmuseAgentRow | null> {
  const rows = await db()<MedmuseAgentRow[]>`
    SELECT * FROM clinical.medmuse_agents WHERE id = ${agentId} AND status = 'active'
  `;
  return rows[0] ?? null;
}

export async function listAgents(): Promise<MedmuseAgentRow[]> {
  return db()<MedmuseAgentRow[]>`
    SELECT * FROM clinical.medmuse_agents ORDER BY role_code ASC
  `;
}

// ============================================================================
// Session
// ============================================================================

export async function createSession(opts: {
  agentId: string;
  userId: string;
  patientId?: string | null;
  title?: string;
}): Promise<MedmuseSessionRow> {
  const rows = await db()<MedmuseSessionRow[]>`
    INSERT INTO clinical.medmuse_sessions (agent_id, user_id, patient_id, title)
    VALUES (${opts.agentId}, ${opts.userId}, ${opts.patientId ?? null}, ${opts.title ?? '新对话'})
    RETURNING *
  `;
  return rows[0];
}

export async function listSessions(userId: string, limit = 50): Promise<MedmuseSessionRow[]> {
  return db()<MedmuseSessionRow[]>`
    SELECT * FROM clinical.medmuse_sessions
    WHERE user_id = ${userId}
    ORDER BY last_active_at DESC
    LIMIT ${limit}
  `;
}

export async function getSessionById(sessionId: string): Promise<MedmuseSessionRow | null> {
  const rows = await db()<MedmuseSessionRow[]>`
    SELECT * FROM clinical.medmuse_sessions WHERE id = ${sessionId}
  `;
  return rows[0] ?? null;
}

export async function touchSession(sessionId: string): Promise<void> {
  await db()`
    UPDATE clinical.medmuse_sessions SET last_active_at = now() WHERE id = ${sessionId}
  `;
}

// ============================================================================
// Message
// ============================================================================

export async function appendMessage(opts: {
  sessionId: string;
  role: 'user' | 'agent' | 'tool';
  content: string;
  toolCalls?: unknown;
  toolResult?: unknown;
  confidence?: 'high' | 'medium' | 'low';
  disclaimer?: string;
  systemPromptVersion?: string;
  idempotencyKey?: string | null;
}): Promise<MedmuseMessageRow> {
  const rows = await db()<MedmuseMessageRow[]>`
    INSERT INTO clinical.medmuse_messages
      (session_id, role, content, tool_calls, tool_result, confidence, disclaimer, system_prompt_version, idempotency_key)
    VALUES (
      ${opts.sessionId},
      ${opts.role},
      ${opts.content},
      ${opts.toolCalls ?? []}::jsonb,
      ${opts.toolResult ?? null}::jsonb,
      ${opts.confidence ?? 'medium'},
      ${opts.disclaimer ?? '本建议由 AI 生成，不构成诊疗依据，最终决策由执业医师做出。'},
      ${opts.systemPromptVersion ?? '1.0'},
      ${opts.idempotencyKey ?? null}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function listMessages(sessionId: string, limit = 100): Promise<MedmuseMessageRow[]> {
  return db()<MedmuseMessageRow[]>`
    SELECT * FROM clinical.medmuse_messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

// ============================================================================
// Approval
// ============================================================================

export async function createApproval(opts: {
  messageId: string;
  action: unknown;
  riskLevel: 'info' | 'warning' | 'critical';
  requestedBy: string;
}) {
  const rows = await db()<MedmuseApprovalRow[]>`
    INSERT INTO clinical.medmuse_approvals (message_id, action, risk_level, requested_by, status)
    VALUES (${opts.messageId}, ${opts.action}::jsonb, ${opts.riskLevel}, ${opts.requestedBy}, 'pending')
    RETURNING *
  `;
  return rows[0];
}

export async function listApprovals(opts: {
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  limit?: number;
}): Promise<MedmuseApprovalRow[]> {
  const limit = opts.limit ?? 100;
  if (opts.status) {
    return db()<MedmuseApprovalRow[]>`
      SELECT * FROM clinical.medmuse_approvals
      WHERE status = ${opts.status}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }
  return db()<MedmuseApprovalRow[]>`
    SELECT * FROM clinical.medmuse_approvals
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function resolveApproval(opts: {
  approvalId: string;
  approved: boolean;
  approvedBy: string;
  rejectionReason?: string;
}): Promise<MedmuseApprovalRow | null> {
  const rows = await db()<MedmuseApprovalRow[]>`
    UPDATE clinical.medmuse_approvals
    SET status = ${opts.approved ? 'approved' : 'rejected'},
        approved_by = ${opts.approvedBy},
        approved_at = now(),
        rejection_reason = ${opts.rejectionReason ?? null}
    WHERE id = ${opts.approvalId} AND status = 'pending'
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function getApprovalById(approvalId: string): Promise<MedmuseApprovalRow | null> {
  const rows = await db()<MedmuseApprovalRow[]>`
    SELECT * FROM clinical.medmuse_approvals WHERE id = ${approvalId}
  `;
  return rows[0] ?? null;
}

/** 扫描 pending 且 expires_at < now() 的工单，批量置为 expired，返回影响行数 */
export async function expireStaleApprovals(): Promise<number> {
  const result = await db()`
    UPDATE clinical.medmuse_approvals
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < now()
  `;
  // postgres.js 返回 count 字段
  return (result as unknown as { count?: number }).count ?? 0;
}

// ============================================================================
// Idempotency Key
// ============================================================================

/**
 * 消费幂等键：
 *  - 已存在且已 consumed，返回缓存的响应；
 *  - 不存在则插入占位行，返回 null（表示首次执行）。
 */
export async function consumeIdempotencyKey(opts: {
  key: string;
  sessionId: string;
  userId: string;
}): Promise<{ cached: IdempotencyKeyRow | null; fresh: boolean }> {
  const rows = await db()<IdempotencyKeyRow[]>`
    INSERT INTO clinical.medmuse_idempotency_keys (id, session_id, user_id)
    VALUES (${opts.key}, ${opts.sessionId}, ${opts.userId})
    ON CONFLICT (id) DO NOTHING
    RETURNING *
  `;
  if (rows[0]) {
    return { cached: null, fresh: true };
  }
  const existing = await db()<IdempotencyKeyRow[]>`
    SELECT * FROM clinical.medmuse_idempotency_keys WHERE id = ${opts.key}
  `;
  return { cached: existing[0] ?? null, fresh: false };
}

/** 写入响应快照并标记 consumed */
export async function saveIdempotencyResponse(opts: {
  key: string;
  response: unknown;
}): Promise<void> {
  await db()`
    UPDATE clinical.medmuse_idempotency_keys
    SET response = ${opts.response}::jsonb, consumed_at = now()
    WHERE id = ${opts.key}
  `;
}
