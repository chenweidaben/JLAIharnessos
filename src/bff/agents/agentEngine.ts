/**
 * MEDMUSE agent 执行引擎 - 单轮对话编排：上下文拼装、模型调用、工具裁决、落库。
 *
 * 医疗安全：
 *   - 上下文窗口最近 20 轮，更早消息折叠为摘要占位，避免 prompt 爆炸；
 *   - 每条 agent 回复强制带 confidence + disclaimer；
 *   - warning/critical 工具绝不自动执行，写 medmuse_approvals 并挂起；
 *   - Idempotency-Key 命中缓存直接回放上次结果，防重放。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getModelProvider, DEFAULT_DISCLAIMER, type ChatMessage, type ToolDefinition, type AgentReply, type Confidence } from './modelProvider';
import {
  defaultToolExecutor,
  getTool,
  listOpenAiTools,
  type ToolContext,
} from './toolRegistry';
import { evaluate, createApprovalTicket } from './sentinel';
import { searchKnowledge, buildCitationBlock } from './kbSearchTool';
import {
  appendMessage,
  listMessages,
  getSessionById,
  touchSession,
  consumeIdempotencyKey,
  saveIdempotencyResponse,
  upsertSessionSummary,
  type MedmuseAgentRow,
} from './medmuseRepo';
import { getAgentEntry } from './agentRegistry';
import { splitForSummary } from './contextSummary';
import { recordCall } from './agentMetrics';

/** 拉取历史的窗口：超阈值后用于覆盖早期对话做规则压缩 */
const CONTEXT_FETCH_LIMIT = 200;

export interface RunAgentTurnInput {
  agent: MedmuseAgentRow;
  userId: string;
  sessionId: string;
  userMessage: string;
  idempotencyKey?: string;
  confirmed?: boolean;
}

export interface PendingApprovalInfo {
  approvalId: string;
  toolName: string;
  riskLevel: 'info' | 'warning' | 'critical';
  reason: string;
}

export interface RunAgentTurnResult {
  reply: string;
  confidence: Confidence;
  disclaimer: string;
  newMessages: Array<{
    role: 'user' | 'agent' | 'tool';
    content: string;
    toolCalls?: unknown;
    toolResult?: unknown;
  }>;
  pendingApproval?: PendingApprovalInfo;
  cached?: boolean;
}

function toChatHistoryRole(m: { role: string }): 'system' | 'user' | 'assistant' | 'tool' {
  if (m.role === 'agent') return 'assistant';
  if (m.role === 'user' || m.role === 'tool') return m.role;
  return 'system';
}

export async function runAgentTurn(input: RunAgentTurnInput): Promise<RunAgentTurnResult> {
  // 健康度埋点：入口打时戳；try 体内任一 return 前置 ok=true，抛错则保持 false。
  const startedAt = Date.now();
  const { agent } = input;
  let ok = false;

  try {
  const { userId, sessionId, userMessage, idempotencyKey, confirmed } = input;
  const newMessages: RunAgentTurnResult['newMessages'] = [];

  // 0. 会话归属校验
  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) {
    throw new Error('SESSION_NOT_FOUND');
  }

  // 1. 幂等键：命中已消费缓存直接回放
  if (idempotencyKey) {
    const { cached } = await consumeIdempotencyKey({ key: idempotencyKey, sessionId, userId });
    if (cached?.consumed_at && cached.response) {
      ok = true;
      return { ...(cached.response as RunAgentTurnResult), cached: true };
    }
  }

  // 2. 落用户消息（带幂等键）
  const userRow = await appendMessage({
    sessionId,
    role: 'user',
    content: userMessage,
    idempotencyKey: idempotencyKey ?? null,
  });
  newMessages.push({ role: 'user', content: userMessage });

  // 3. 拼上下文：历史超 20 条时，早期 N 条压缩为规则摘要 + 最近 10 条原文；
  //    未超阈值则保留全部历史原文（行为与压缩前一致）。
  const history = (await listMessages(sessionId, CONTEXT_FETCH_LIMIT)).filter(
    (m) => m.id !== userRow.id,
  );
  const { recent, summary } = splitForSummary(history);
  const messages: ChatMessage[] = [{ role: 'system', content: agent.system_prompt }];
  if (summary) {
    messages.push({ role: 'system', content: summary });
    // 摘要落库（写 sessions.context_summary，不进入消息流）
    await upsertSessionSummary(sessionId, summary);
  }
  for (const m of recent) {
    messages.push({ role: toChatHistoryRole(m), content: m.content ?? '' });
  }
  messages.push({ role: 'user', content: userMessage });

  // 4. 岗位允许的工具子集
  const entry = getAgentEntry(agent.role_code);
  const allowedNames = new Set(entry?.allowedTools ?? []);
  const tools: ToolDefinition[] = listOpenAiTools().filter((t) => allowedNames.has(t.function.name));

  // 5. 调模型（带重试/熔断）
  const provider = getModelProvider();
  const modelReply: AgentReply = await provider.chat(messages, tools);
  const confidence: Confidence = modelReply.confidence ?? 'medium';
  const disclaimer = modelReply.disclaimer ?? DEFAULT_DISCLAIMER;

  // 6. 处理 tool_calls
  let pendingApproval: PendingApprovalInfo | undefined;
  const toolNotes: string[] = [];
  const execCtx: ToolContext = { userId, sessionId, patientId: session.patient_id, confirmed };

  for (const call of modelReply.toolCalls) {
    const meta = getTool(call.name);
    if (!meta) continue;
    const decision = evaluate(call.name, meta.riskLevel, execCtx);

    if (decision.requiresApproval) {
      const pendingMsg = await appendMessage({
        sessionId,
        role: 'agent',
        content: `需要审批：工具 ${call.name}（${meta.riskLevel} 级）${decision.reason}`,
        toolCalls: [{ id: call.id, name: call.name, args: call.args }],
        confidence,
        disclaimer,
      });
      const ticket = await createApprovalTicket({
        messageId: pendingMsg.id,
        toolName: call.name,
        args: call.args,
        riskLevel: meta.riskLevel,
        requestedBy: userId,
      });
      pendingApproval = {
        approvalId: ticket.id,
        toolName: call.name,
        riskLevel: meta.riskLevel,
        reason: decision.reason,
      };
      newMessages.push({
        role: 'agent',
        content: pendingMsg.content,
        toolCalls: [{ id: call.id, name: call.name, args: call.args }],
      });
      break;
    }

    // info / 已确认 warning：执行
    const result = await defaultToolExecutor.execute(call.name, call.args, execCtx);
    await appendMessage({
      sessionId,
      role: 'tool',
      content: `${call.name} 执行完成`,
      toolCalls: [{ id: call.id, name: call.name, args: call.args }],
      toolResult: result,
      confidence,
      disclaimer,
    });
    newMessages.push({
      role: 'tool',
      content: `${call.name} 执行完成`,
      toolCalls: [{ id: call.id, name: call.name, args: call.args }],
      toolResult: result,
    });
    toolNotes.push(`[已调用工具 ${call.name}]`);
  }

  // 7. 落 agent 回复
  //    知识中台 RAG：对用户提问做关键词倒序扫描，命中院内规章制度/临床路径时，
  //    在回复尾部追加「参考依据」引用块；无命中不追加。
  const citationBlock = buildCitationBlock(searchKnowledge(userMessage));
  const reply = [modelReply.content, ...toolNotes, citationBlock].filter(Boolean).join('\n\n');
  await appendMessage({ sessionId, role: 'agent', content: reply, confidence, disclaimer });
  newMessages.push({ role: 'agent', content: reply });

  await touchSession(sessionId);

  const result: RunAgentTurnResult = { reply, confidence, disclaimer, newMessages, pendingApproval };

  // 8. 缓存响应
  if (idempotencyKey) {
    await saveIdempotencyResponse({ key: idempotencyKey, response: result });
  }

  ok = true;
  return result;
  } finally {
    // 无论成功/失败/缓存回放都上报；ok=false 仅由体内抛错产生
    recordCall(agent.role_code, Date.now() - startedAt, ok);
  }
}
