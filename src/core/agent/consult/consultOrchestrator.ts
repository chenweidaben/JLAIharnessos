/**
 * 咨询会话主流程编排器（契约 §10）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 流程顺序固定，禁止跳过安全旁路：
 * 1. 装载线程与历史；终态拒绝新消息；
 * 2. evaluateSafety：acute -> escalated 旁路，发急症引导、审计 acute_bypass、
 *    事件 safety:acute，不进角色、不产草稿；
 * 3. classifyIntent：exit -> 关闭线程；
 * 4. Supervisor 分诊选角色；Examiner 追问 -> clarifying；Doctor / Pharmacist
 *    产出草稿 -> Sentinel 审批 -> drafting -> review_pending；
 * 5. 工具调用在角色内完成，审计只留脱敏摘要；
 * 6. 记忆事实合并；持久化消息 / 草稿 / 审计（DEMO_MODE 落进程内存）；
 * 7. 组装 SSE 事件序列。
 */

import { createAuditEntry } from './audit';
import { classifyIntent } from './intentClassifier';
import type { SafeLlmPort } from './llm/safeLlm';
import { mergeFacts } from './memory/profileMemory';
import type { ConsultAgentPort, RoleInput, RoleOutput } from './ports';
import { buildRoleRegistry, getRolePort, type RoleRegistry } from './roles';
import { appendDisclaimer, confidenceLevel, newId, nowIso } from './roleSupport';
import { evaluateSafety } from './safety/safetyGate';
import { approveDraft } from './sentinel/sentinelGateway';
import { assertTransition, isTerminalStatus } from './stateMachine';
import type { ToolRegistry } from './tools/toolRegistry';
import type {
  ConsultAuditEntry,
  ConsultDraft,
  ConsultMessage,
  ConsultProfileMemory,
  ConsultThread,
  EvidenceItem,
  ProfileFact,
  RoleKind,
  SseEvent,
  ThreadStatus,
  ToolCallRecord,
  ToolStatus,
} from './types';
import { ACUTE_GUIDANCE, DISCLAIMER } from './types';

/** 编排器上下文：仓储端口 + 安全 LLM + 工具注册表 + 当前画像 */
export interface OrchestratorContext {
  userId: string;
  traceId: string;
  repo: ConsultAgentPort;
  llm: SafeLlmPort;
  tools: ToolRegistry;
  profile: ConsultProfileMemory;
}

/** 编排器单次处理结果 */
export interface OrchestratorResult {
  thread: ConsultThread;
  message: ConsultMessage;
  draft: ConsultDraft | null;
  audit: ConsultAuditEntry[];
  events: SseEvent[];
}

/** 线程状态迁移辅助：idle 起步先进入 collecting，再走向目标态；非法转移显式抛错 */
function transitionTo(thread: ConsultThread, target: ThreadStatus): void {
  if (thread.status === target) {
    return;
  }
  if (thread.status === 'idle' && target !== 'collecting') {
    assertTransition('idle', 'collecting');
    thread.status = 'collecting';
  }
  if (thread.status !== target) {
    assertTransition(thread.status, target);
    thread.status = target;
  }
}

/** 从审计条目构造工具调用记录（只留脱敏摘要字段，不回显原始入参） */
function recordsFromAudit(auditList: ConsultAuditEntry[]): ToolCallRecord[] {
  return auditList
    .filter(
      (entry): entry is ConsultAuditEntry & { toolName: string; toolStatus: ToolStatus } =>
        entry.toolName !== null && entry.toolStatus !== null,
    )
    .map((entry) => ({
      callId: entry.id,
      name: entry.toolName,
      status: entry.toolStatus,
      durationMs: entry.durationMs ?? 0,
      evidenceCount: entry.evidenceCount ?? 0,
      errorClass: entry.errorClass,
      summary: typeof entry.detail.summary === 'string' ? entry.detail.summary : null,
    }));
}

/** 从审计条目构造 SSE tool 事件（end 阶段；工具 start 帧由流式路由分片补充） */
function toolEventsFromAudit(auditList: ConsultAuditEntry[]): SseEvent[] {
  const events: SseEvent[] = [];
  for (const entry of auditList) {
    if (!entry.toolName || !entry.toolStatus) {
      continue;
    }
    events.push({
      type: 'tool',
      stage: 'end',
      callId: entry.id,
      toolName: entry.toolName,
      success: entry.toolStatus === 'success',
      summary: typeof entry.detail.summary === 'string' ? entry.detail.summary : undefined,
      evidenceCount: entry.evidenceCount ?? undefined,
    });
  }
  return events;
}

/**
 * 处理单条用户咨询消息（核心编排入口）
 *
 * @param threadId 会话线程 ID
 * @param userText 用户输入文本
 * @param ctx 编排上下文（仓储 / LLM / 工具 / 画像）
 */
export async function handleConsultMessage(
  threadId: string,
  userText: string,
  ctx: OrchestratorContext,
): Promise<OrchestratorResult> {
  const thread = await ctx.repo.findThread(threadId, ctx.userId);
  if (!thread) {
    throw new Error('THREAD_NOT_FOUND');
  }
  if (isTerminalStatus(thread.status)) {
    throw new Error('THREAD_CLOSED');
  }

  const history = await ctx.repo.listMessages(threadId);
  const safety = evaluateSafety(userText);

  // ---- 急症旁路：优先于任何角色编排，不进角色、不产草稿 ----
  if (safety.level === 'acute') {
    transitionTo(thread, 'escalated');
    thread.intent = 'acute_emergency';
    thread.safetyLevel = 'acute';
    thread.currentRole = null;
    thread.updatedAt = nowIso();

    const audit = createAuditEntry({
      threadId,
      actorRole: 'system',
      action: 'acute_bypass',
      traceId: ctx.traceId,
      detail: { matched: safety.matched, level: 'acute' },
    });
    const message: ConsultMessage = {
      id: newId('msg'),
      threadId,
      role: 'assistant',
      content: ACUTE_GUIDANCE,
      intent: 'acute_emergency',
      roleKind: null,
      toolCalls: null,
      toolName: null,
      safetyLevel: 'acute',
      disclaimer: DISCLAIMER,
      traceId: ctx.traceId,
      createdAt: nowIso(),
    };
    const events: SseEvent[] = [
      { type: 'safety:acute', matched: safety.matched, guidance: ACUTE_GUIDANCE },
      { type: 'disclaimer', text: DISCLAIMER },
      { type: 'done', messageId: message.id },
    ];

    await ctx.repo.saveThread(thread);
    await ctx.repo.saveMessage(message);
    await ctx.repo.saveAudit(audit);

    return { thread, message, draft: null, audit: [audit], events };
  }

  const intent = classifyIntent(userText, history);

  // ---- 退出关闭会话 ----
  if (intent.intent === 'exit') {
    transitionTo(thread, 'closed');
    thread.intent = 'exit';
    thread.safetyLevel = safety.level;
    thread.currentRole = null;
    thread.closedAt = nowIso();
    thread.updatedAt = nowIso();

    const exitAudit = createAuditEntry({
      threadId,
      actorRole: 'user',
      action: 'thread_exit',
      traceId: ctx.traceId,
      detail: { intent: 'exit' },
    });
    const closeAudit = createAuditEntry({
      threadId,
      actorRole: 'system',
      action: 'thread_closed',
      traceId: ctx.traceId,
      detail: { closedAt: thread.closedAt },
    });
    const reply = appendDisclaimer('会话已结束，感谢您的咨询。如需再次咨询可新建会话。');
    const message: ConsultMessage = {
      id: newId('msg'),
      threadId,
      role: 'assistant',
      content: reply,
      intent: 'exit',
      roleKind: null,
      toolCalls: null,
      toolName: null,
      safetyLevel: safety.level,
      disclaimer: DISCLAIMER,
      traceId: ctx.traceId,
      createdAt: nowIso(),
    };
    const events: SseEvent[] = [
      { type: 'disclaimer', text: DISCLAIMER },
      { type: 'done', messageId: message.id },
    ];

    await ctx.repo.saveThread(thread);
    await ctx.repo.saveMessage(message);
    await ctx.repo.saveAudit(exitAudit);
    await ctx.repo.saveAudit(closeAudit);

    return { thread, message, draft: null, audit: [exitAudit, closeAudit], events };
  }

  // ---- 常规问诊：Supervisor 分诊 -> 选中角色 ----
  const roleRegistry: RoleRegistry = buildRoleRegistry(ctx.llm);
  const baseInput: RoleInput = {
    thread,
    history,
    userText,
    intent: intent.intent,
    tools: ctx.tools,
    profile: ctx.profile,
    traceId: ctx.traceId,
  };

  const events: SseEvent[] = [];
  const auditList: ConsultAuditEntry[] = [];
  const replyParts: string[] = [];
  const evidence: EvidenceItem[] = [];
  const memoryUpdates: ProfileFact[] = [];
  let draft: ConsultDraft | null = null;
  let activeRole: RoleKind | null = 'supervisor';

  const supervisor = getRolePort(roleRegistry, 'supervisor');
  if (!supervisor) {
    throw new Error('SUPERVISOR_ROLE_MISSING');
  }
  const supervisorOutput: RoleOutput = await supervisor.handle(baseInput);
  auditList.push(...supervisorOutput.audit);
  replyParts.push(supervisorOutput.reply);
  evidence.push(...supervisorOutput.evidence);
  memoryUpdates.push(...supervisorOutput.memoryUpdates);
  events.push({ type: 'delta', text: supervisorOutput.reply });
  events.push(...toolEventsFromAudit(supervisorOutput.audit));

  let roleOutput: RoleOutput | null = null;
  if (supervisorOutput.nextRole) {
    const role = getRolePort(roleRegistry, supervisorOutput.nextRole);
    if (role) {
      activeRole = role.kind;
      roleOutput = await role.handle(baseInput);
      auditList.push(...roleOutput.audit);
      replyParts.push(roleOutput.reply);
      evidence.push(...roleOutput.evidence);
      memoryUpdates.push(...roleOutput.memoryUpdates);
      events.push({ type: 'delta', text: roleOutput.reply });
      events.push(...toolEventsFromAudit(roleOutput.audit));
    }
  }

  // ---- 状态迁移与哨兵审批：先审批，通过后才进入 drafting -> review_pending ----
  if (roleOutput?.draft) {
    const existingDrafts = await ctx.repo.listDrafts(threadId, roleOutput.draft.kind);
    const approvedHashes = new Map<string, string>();
    for (const existing of existingDrafts) {
      approvedHashes.set(existing.draftHash, existing.id);
    }
    const decision = approveDraft(roleOutput.draft, approvedHashes, { safetyLevel: safety.level });

    if (decision.decision === 'rejected') {
      const rejectAudit = createAuditEntry({
        threadId,
        actorRole: 'system',
        action: 'sentinel_rejected',
        traceId: ctx.traceId,
        detail: { draftHash: decision.draftHash, reason: decision.reason },
      });
      auditList.push(rejectAudit);
      thread.currentRole = null;
      replyParts.push(appendDisclaimer(`草稿未通过安全校验：${decision.reason ?? '未知原因'}`));
      events.push({
        type: 'error',
        code: 'DRAFT_REJECTED',
        message: decision.reason ?? '草稿被哨兵驳回',
      });
      draft = null;
    } else if (decision.decision === 'duplicate' && decision.existingDraftId) {
      const duplicateDraft =
        existingDrafts.find((item) => item.id === decision.existingDraftId) ?? roleOutput.draft;
      const duplicateAudit = createAuditEntry({
        threadId,
        actorRole: 'system',
        action: 'sentinel_duplicate',
        traceId: ctx.traceId,
        detail: { draftHash: decision.draftHash, existingDraftId: decision.existingDraftId },
      });
      auditList.push(duplicateAudit);
      draft = duplicateDraft;
      transitionTo(thread, 'drafting');
      transitionTo(thread, 'review_pending');
      thread.currentRole = activeRole;
      events.push({ type: 'draft', draft });
    } else {
      draft = roleOutput.draft;
      await ctx.repo.saveDraft(draft);
      const approveAudit = createAuditEntry({
        threadId,
        actorRole: 'system',
        action: 'sentinel_approved',
        traceId: ctx.traceId,
        detail: { draftHash: decision.draftHash, draftKind: draft.kind },
      });
      auditList.push(approveAudit);
      transitionTo(thread, 'drafting');
      transitionTo(thread, 'review_pending');
      thread.currentRole = activeRole;
      events.push({ type: 'draft', draft });
    }
  } else if (activeRole === 'examiner' || roleOutput?.followUpQuestions.length) {
    transitionTo(thread, 'clarifying');
    thread.currentRole = 'examiner';
  } else if (thread.status === 'idle') {
    transitionTo(thread, 'collecting');
    thread.currentRole = activeRole;
  } else {
    thread.currentRole = activeRole;
  }

  // ---- 记忆事实合并并持久化 ----
  const mergedFacts = mergeFacts(ctx.profile.facts, memoryUpdates);
  const profile: ConsultProfileMemory = {
    ...ctx.profile,
    facts: mergedFacts,
    updatedAt: nowIso(),
  };
  await ctx.repo.saveProfile(profile);

  // ---- 组装最终消息并落库 ----
  const toolCalls = recordsFromAudit(auditList);
  const lastToolAudit = [...auditList].reverse().find((entry) => entry.toolName !== null);
  const message: ConsultMessage = {
    id: newId('msg'),
    threadId,
    role: 'assistant',
    content: replyParts.join('\n\n'),
    intent: intent.intent,
    roleKind: activeRole,
    toolCalls: toolCalls.length > 0 ? toolCalls : null,
    toolName: lastToolAudit?.toolName ?? null,
    safetyLevel: safety.level,
    disclaimer: DISCLAIMER,
    traceId: ctx.traceId,
    createdAt: nowIso(),
  };

  thread.intent = intent.intent;
  thread.safetyLevel = safety.level;
  thread.updatedAt = nowIso();

  events.push({ type: 'disclaimer', text: DISCLAIMER });
  events.push({
    type: 'meta',
    confidence: confidenceLevel(intent.confidence),
    disclaimer: DISCLAIMER,
  });
  events.push({ type: 'done', messageId: message.id });

  await ctx.repo.saveThread(thread);
  await ctx.repo.saveMessage(message);
  for (const entry of auditList) {
    await ctx.repo.saveAudit(entry);
  }

  return { thread, message, draft, audit: auditList, events };
}
