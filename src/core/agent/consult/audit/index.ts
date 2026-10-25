/**
 * 审计条目构造与脱敏（契约 §0 audit/index.ts，红线 §15-5 / §15-6）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 工具审计只留 name / status / durationMs / evidenceCount / errorClass / summary，
 * 禁止记录原始入参明文；四角色审计透传 traceId 与自身 actorRole。
 */

import { newId, nowIso } from '../roleSupport';
import type { ConsultAuditEntry, RoleKind, ToolCallRecord, ToolStatus } from '../types';

/** 禁止进入审计 detail 的原始入参类键名（大小写不敏感） */
const RAW_ARG_KEY_PATTERN =
  /^(args|input|payload|raw|requestbody|params|request|rawargs|toolargs|body)$/i;

/** 递归剔除原始入参类键，返回脱敏后的结构化摘要 */
export function redactRawArgs(detail: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (RAW_ARG_KEY_PATTERN.test(key)) {
      continue;
    }
    if (Array.isArray(value)) {
      output[key] = value.map((entry) => redactRawArgsEntry(entry));
    } else if (value !== null && typeof value === 'object') {
      output[key] = redactRawArgs(value as Record<string, unknown>);
    } else {
      output[key] = value;
    }
  }
  return output;
}

/** 数组元素递归脱敏辅助 */
function redactRawArgsEntry(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactRawArgsEntry(entry));
  }
  if (value !== null && typeof value === 'object') {
    return redactRawArgs(value as Record<string, unknown>);
  }
  return value;
}

/** 审计条目构造入参 */
export interface AuditEntryParams {
  threadId: string;
  actorRole: RoleKind | 'system' | 'user';
  action: string;
  traceId: string;
  toolName?: string | null;
  toolStatus?: ToolStatus | null;
  durationMs?: number | null;
  evidenceCount?: number | null;
  errorClass?: string | null;
  detail?: Record<string, unknown>;
}

/** 构造审计条目；detail 先经脱敏，原始入参类键不得落库 */
export function createAuditEntry(params: AuditEntryParams): ConsultAuditEntry {
  return {
    id: newId('audit'),
    threadId: params.threadId,
    actorRole: params.actorRole,
    action: params.action,
    toolName: params.toolName ?? null,
    toolStatus: params.toolStatus ?? null,
    durationMs: params.durationMs ?? null,
    evidenceCount: params.evidenceCount ?? null,
    errorClass: params.errorClass ?? null,
    traceId: params.traceId,
    detail: redactRawArgs(params.detail ?? {}),
    createdAt: nowIso(),
  };
}

/** 构造工具调用审计记录（只留脱敏摘要字段，禁止原始入参） */
export function createToolCallRecord(params: {
  callId: string;
  name: string;
  status: ToolStatus;
  durationMs: number;
  evidenceCount: number;
  errorClass: string | null;
  summary: string | null;
}): ToolCallRecord {
  return {
    callId: params.callId,
    name: params.name,
    status: params.status,
    durationMs: params.durationMs,
    evidenceCount: params.evidenceCount,
    errorClass: params.errorClass,
    summary: params.summary,
  };
}
