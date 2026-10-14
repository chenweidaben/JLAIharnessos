/**
 * MEDMUSE 前端 API 封装
 *
 * 对接 BFF /api/v1/medmuse/* ：
 *   - POST 类接口（创建会话/发消息/审批决议）必须携带 Idempotency-Key 头，
 *     后端缺失将返回 400；这里统一用 crypto.randomUUID() 生成；
 *   - GET 类接口复用 request.get 自动解包 ApiResponse.data。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import request, { get, post } from './request';

/** 会话条目（listSessions 返回） */
export interface MedmuseSession {
  id: string;
  agentId: string;
  userId: string;
  patientId: string | null;
  title: string | null;
  createdAt: string;
  lastActiveAt: string;
}

/** 聊天消息（listMessages 返回） */
export interface MedmuseMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string | null;
  confidence?: 'high' | 'medium' | 'low' | null;
  disclaimer?: string | null;
  createdAt: string;
}

/** 审批工单 */
export interface MedmuseApproval {
  id: string;
  sessionId: string;
  toolName: string;
  riskLevel: 'info' | 'warning' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  payload: Record<string, unknown>;
  requestedBy?: string | null;
  reason?: string | null;
  createdAt: string;
}

/** 发消息响应（runAgentTurn 返回） */
export interface MedmuseChatResult {
  message: MedmuseMessage;
  pendingApproval?: MedmuseApproval | null;
  toolCalls?: Array<{ name: string; summary?: string }>;
}

/** 生成幂等键（crypto.randomUUID，降级到时间戳） */
function newIdemKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 列出当前用户的 MEDMUSE 会话 */
export function listSessions(): Promise<MedmuseSession[]> {
  return get<MedmuseSession[]>('/api/v1/medmuse/sessions');
}

/**
 * 按 roleCode 新建会话。
 * 后端要求 Idempotency-Key 头，用独立 axios 调用注入。
 */
export async function createSession(
  roleCode: string,
  title?: string,
): Promise<{ session: MedmuseSession; agent: { id: string; roleCode: string; name: string } }> {
  const resp = await request.request<{ code: number; data: { session: MedmuseSession; agent: { id: string; roleCode: string; name: string } } }>({
    url: '/api/v1/medmuse/sessions',
    method: 'post',
    data: { roleCode, title: title ?? null },
    headers: { 'Idempotency-Key': newIdemKey() },
  });
  return resp.data.data;
}

/**
 * 发送消息。必须携带 Idempotency-Key；confirmed 用于二次确认写操作。
 */
export async function sendMessage(
  sessionId: string,
  content: string,
  confirmed = false,
): Promise<MedmuseChatResult> {
  const resp = await request.request<{ code: number; data: MedmuseChatResult }>({
    url: `/api/v1/medmuse/sessions/${sessionId}/chat`,
    method: 'post',
    data: { content, confirmed },
    headers: { 'Idempotency-Key': newIdemKey() },
  });
  return resp.data.data;
}

/** 拉取会话历史消息 */
export function listMessages(sessionId: string): Promise<MedmuseMessage[]> {
  return get<MedmuseMessage[]>(`/api/v1/medmuse/sessions/${sessionId}/messages`);
}

/** 列出审批工单（默认 pending） */
export function listApprovals(status: 'pending' | 'approved' | 'rejected' | 'expired' = 'pending'): Promise<MedmuseApproval[]> {
  return get<MedmuseApproval[]>('/api/v1/medmuse/approvals', { status });
}

/** 审批决议（approve/reject），需 Idempotency-Key */
export async function decideApproval(
  approvalId: string,
  approved: boolean,
  comment?: string,
): Promise<MedmuseApproval> {
  const resp = await request.request<{ code: number; data: MedmuseApproval }>({
    url: `/api/v1/medmuse/approvals/${approvalId}/decide`,
    method: 'post',
    data: { approved, comment: comment ?? null },
    headers: { 'Idempotency-Key': newIdemKey() },
  });
  return resp.data.data;
}
