/**
 * 角色内部工具调用辅助（契约 §6 / §15-5 / §15-6）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 角色内调用工具时统一经由本辅助测量耗时、构造脱敏工具审计条目与
 * 工具调用记录；审计透传 traceId 与当前 actorRole；不落原始入参明文。
 */

import { createAuditEntry, createToolCallRecord } from '../audit';
import type { ToolRegistry, ToolResult } from '../tools/toolRegistry';
import type {
  ConsultAuditEntry,
  ConsultProfileMemory,
  EvidenceItem,
  RoleKind,
  ToolCallRecord,
} from '../types';

/** 工具调用统一产物：脱敏审计条目 + 工具记录 + 证据 + 原始结果 */
export interface ToolCallOutcome {
  record: ToolCallRecord;
  audit: ConsultAuditEntry;
  evidence: EvidenceItem[];
  result: ToolResult;
}

/** 角色调用工具所需入参 */
export interface InvokeToolParams {
  actorRole: RoleKind;
  threadId: string;
  traceId: string;
  tools: ToolRegistry;
  memory: ConsultProfileMemory;
  toolName: string;
  args: Record<string, unknown>;
}

/** 调用工具并同步生成脱敏审计条目；原始入参不进入审计 detail */
export async function invokeToolWithAudit(params: InvokeToolParams): Promise<ToolCallOutcome> {
  const startedAt = Date.now();
  const result = await params.tools.invoke(params.toolName, params.args, {
    traceId: params.traceId,
    memory: params.memory,
  });
  const durationMs = Date.now() - startedAt;
  const toolStatus = result.success ? 'success' : 'error';
  const audit = createAuditEntry({
    threadId: params.threadId,
    actorRole: params.actorRole,
    action: `tool_call:${params.toolName}`,
    traceId: params.traceId,
    toolName: params.toolName,
    toolStatus,
    durationMs,
    evidenceCount: result.evidence.length,
    errorClass: result.errorClass,
    detail: { tool: params.toolName, summary: result.summary },
  });
  const record = createToolCallRecord({
    callId: audit.id,
    name: params.toolName,
    status: toolStatus,
    durationMs,
    evidenceCount: result.evidence.length,
    errorClass: result.errorClass,
    summary: result.summary,
  });
  return { record, audit, evidence: result.evidence, result };
}

/** 证据去重：按 kind + label + snippet 组合键去重，保持首次出现顺序 */
export function dedupeEvidence(evidence: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  const output: EvidenceItem[] = [];
  for (const item of evidence) {
    const key = `${item.kind}|${item.label}|${item.snippet}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  }
  return output;
}
