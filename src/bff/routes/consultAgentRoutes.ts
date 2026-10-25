/**
 * consult-agent M86 BFF 路由（契约 §12，前缀 /api/v1/consult-agent，共 12 个 handler）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 医疗安全口径：AI 仅提供健康科普与分诊参考，不替代执业医师 / 药师面诊与处方决策；
 * 诊断 / 处方草稿恒需执业医师复核，AI 不自主开具在院医嘱；工具审计只留脱敏摘要，
 * 不回显原始入参。权限码 / 幂等 / 审计 / CSRF 由 server.ts 中间件自动装配，
 * handler 内仅调用 requirePermissionCode 做细粒度权限校验；SSE 流路由不消费
 * Idempotency-Key。
 */

import {
  buildRulesSnapshot,
  type ConsultAgentPort,
  type ConsultAuditEntry,
  type ConsultDraft,
  type ConsultMessage,
  type ConsultProfileMemory,
  type ConsultThread,
  createAuditEntry,
  createDefaultToolRegistry,
  createSafeLlm,
  DISCLAIMER,
  handleConsultMessage,
  isTerminalStatus,
  messageSendSchema,
  newId,
  nowIso,
  type OrchestratorContext,
  type OrchestratorResult,
  type SseEvent,
  threadCreateSchema,
  transcribeSchema,
} from '../../core/agent/consult/index.js';
import { createConsultAgentRepo } from '../../db/repositories/consultAgentRepo.js';
import { requirePermissionCode } from '../middleware/auth.js';
import { CONSULT_AGENT_PERMISSIONS } from '../permissions.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';

// ============================================================================
// 模块级仓储实例（DEMO_MODE 下持有进程内会话状态，跨请求保持）
// ============================================================================

const repo: ConsultAgentPort = createConsultAgentRepo();

/** SSE 响应头：禁止中间层 / 网关缓冲，保证逐帧到达（契约 §11） */
const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

/** 流式帧间隔（毫秒）：打字机节奏 */
const STREAM_TICK_MS = 80;

/** delta 帧单块字符数：assistant 回复按 ~10 字切分 */
const DELTA_CHUNK_SIZE = 10;

/** 把回复正文切成小块，尽量在换行处断句，打字输出更自然 */
function chunkText(text: string, size = DELTA_CHUNK_SIZE): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    const newline = text.indexOf('\n', i);
    if (newline !== -1 && newline < end) {
      end = newline + 1;
    }
    out.push(text.slice(i, end));
    i = end;
  }
  return out;
}

/** 装配编排器上下文：仓储 + 安全降级 LLM + 默认工具注册表 + 当前画像 */
function buildOrchestratorContext(
  c: Ctx,
  consultRepo: ConsultAgentPort,
  profile: ConsultProfileMemory,
): OrchestratorContext {
  return {
    userId: c.user?.id ?? '',
    traceId: c.traceId,
    repo: consultRepo,
    llm: createSafeLlm(),
    tools: createDefaultToolRegistry(),
    profile,
  };
}

/** 编排异常到 HTTP 状态码映射：线程不存在 404；终态 409；其余 500（不回显堆栈） */
function mapConsultError(error: unknown, c: Ctx): Response {
  const code = error instanceof Error ? error.message : '';
  if (code === 'THREAD_NOT_FOUND') {
    return json(fail(ErrorCode.NOT_FOUND, '咨询会话不存在', c.traceId), 404);
  }
  if (code === 'THREAD_CLOSED') {
    return json(fail(ErrorCode.CONFLICT, '咨询会话已结束或已关闭', c.traceId), 409);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, '咨询处理失败，请稍后重试', c.traceId), 500);
}

/** 装载当前用户名下线程；不存在返回 404 响应（调用方先判空再继续） */
async function findOwnedThread(c: Ctx, threadId: string): Promise<ConsultThread | Response> {
  const thread = await repo.findThread(threadId, c.user?.id ?? '');
  if (!thread) {
    return json(fail(ErrorCode.NOT_FOUND, '咨询会话不存在', c.traceId), 404);
  }
  return thread;
}

/** 按事件列表装配 SSE 帧（delta 切分，其余事件整帧），末尾追加 [DONE] 结束帧 */
function buildSseFrames(events: SseEvent[]): Uint8Array[] {
  const encoder = new TextEncoder();
  const frames: Uint8Array[] = [];
  for (const event of events) {
    if (event.type === 'delta') {
      for (const piece of chunkText(event.text)) {
        frames.push(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: piece })}\n\n`));
      }
    } else {
      frames.push(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    }
  }
  frames.push(encoder.encode('data: [DONE]\n\n'));
  return frames;
}

/** 以打字机节奏逐帧推送 SSE 流；监听客户端 abort 停流并清理定时器 */
function openSseStream(frames: Uint8Array[], c: Ctx): Response {
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let idx = 0;
      const pump = () => {
        if (closed) return;
        if (idx < frames.length) {
          controller.enqueue(frames[idx]);
          idx += 1;
          timer = setTimeout(pump, STREAM_TICK_MS);
        } else {
          closed = true;
          controller.close();
        }
      };
      timer = setTimeout(pump, STREAM_TICK_MS);
      c.req.signal?.addEventListener('abort', () => {
        closed = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* 流已关闭 */
        }
      });
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
    },
  });
  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}

// ============================================================================
// 路由表（契约 §12 端点表）
// ============================================================================

export const consultAgentRoutes: RouteDef[] = [
  {
    // 1. 创建会话（可带首条消息）
    method: 'POST',
    path: '/api/v1/consult-agent/threads',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.WRITE);
      if (denied) return denied;

      const raw = await c.body();
      const parsed = threadCreateSchema.safeParse(raw);
      if (!parsed.success) {
        return json(fail(ErrorCode.BAD_REQUEST, '入参非法', c.traceId), 400);
      }

      const userId = c.user?.id ?? '';
      const now = nowIso();
      const titleText = parsed.data.title?.trim();
      const thread: ConsultThread = {
        id: newId('thread'),
        userId,
        patientId: parsed.data.patientId ?? null,
        title: titleText && titleText.length > 0 ? titleText : '在线咨询会话',
        status: 'idle',
        intent: 'unknown',
        safetyLevel: 'normal',
        currentRole: null,
        meta: {},
        closedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const savedThread = await repo.saveThread(thread);

      const initialMessage = parsed.data.initialMessage?.trim();
      if (!initialMessage) {
        return json(ok({ thread: savedThread, messages: [] }, 'ok', c.traceId));
      }

      try {
        const profile = await repo.getProfile(userId);
        const result = await handleConsultMessage(
          savedThread.id,
          initialMessage,
          buildOrchestratorContext(c, repo, profile),
        );
        const messages = await repo.listMessages(savedThread.id);
        return json(
          ok(
            { thread: result.thread, messages, draft: result.draft ?? undefined },
            'ok',
            c.traceId,
          ),
        );
      } catch (error) {
        return mapConsultError(error, c);
      }
    },
  },

  {
    // 2. 会话列表
    method: 'GET',
    path: '/api/v1/consult-agent/threads',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.READ);
      if (denied) return denied;
      const threads = await repo.listThreads(c.user?.id ?? '');
      return json(ok({ threads }, 'ok', c.traceId));
    },
  },

  {
    // 3. 发送消息（非流式快照）
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/messages',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.WRITE);
      if (denied) return denied;

      const raw = await c.body();
      const parsed = messageSendSchema.safeParse(raw);
      if (!parsed.success) {
        return json(
          fail(ErrorCode.BAD_REQUEST, '入参非法：content 必填且不超过 4000 字符', c.traceId),
          400,
        );
      }

      try {
        const userId = c.user?.id ?? '';
        const profile = await repo.getProfile(userId);
        const result: OrchestratorResult = await handleConsultMessage(
          c.params.threadId,
          parsed.data.content,
          buildOrchestratorContext(c, repo, profile),
        );
        return json(
          ok(
            {
              thread: result.thread,
              message: result.message,
              draft: result.draft ?? undefined,
              events: result.events,
            },
            'ok',
            c.traceId,
          ),
        );
      } catch (error) {
        return mapConsultError(error, c);
      }
    },
  },

  {
    // 4. 历史消息（createdAt 升序）
    method: 'GET',
    path: '/api/v1/consult-agent/threads/:threadId/messages',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.READ);
      if (denied) return denied;

      const threadResult = await findOwnedThread(c, c.params.threadId);
      if (threadResult instanceof Response) return threadResult;

      const messages = await repo.listMessages(c.params.threadId);
      return json(ok({ messages }, 'ok', c.traceId));
    },
  },

  {
    // 5. 语音转写 DEMO：归一化文本（transcript / audioText 至少其一）
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/transcribe',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.WRITE);
      if (denied) return denied;

      const threadResult = await findOwnedThread(c, c.params.threadId);
      if (threadResult instanceof Response) return threadResult;

      const raw = await c.body();
      const parsed = transcribeSchema.safeParse(raw);
      if (!parsed.success) {
        return json(
          fail(ErrorCode.BAD_REQUEST, 'transcript 与 audioText 至少其一非空', c.traceId),
          400,
        );
      }
      const transcript = parsed.data.transcript?.trim() ?? '';
      const audioText = parsed.data.audioText?.trim() ?? '';
      const text = (transcript.length > 0 ? transcript : audioText).replace(/\s+/g, ' ').trim();
      return json(ok({ text }, 'ok', c.traceId));
    },
  },

  {
    // 6. 审计轨迹
    method: 'GET',
    path: '/api/v1/consult-agent/threads/:threadId/audit',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.AUDIT);
      if (denied) return denied;

      const threadResult = await findOwnedThread(c, c.params.threadId);
      if (threadResult instanceof Response) return threadResult;

      const entries = await repo.listAudit(c.params.threadId);
      return json(ok({ entries }, 'ok', c.traceId));
    },
  },

  {
    // 7. 规则快照
    method: 'GET',
    path: '/api/v1/consult-agent/rules/snapshot',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.READ);
      if (denied) return denied;
      const snapshot = buildRulesSnapshot();
      return json(
        ok(
          {
            version: snapshot.version,
            disclaimer: snapshot.disclaimer,
            acuteKeywords: snapshot.acuteKeywords,
            tools: snapshot.tools,
            permissions: snapshot.permissions,
          },
          'ok',
          c.traceId,
        ),
      );
    },
  },

  {
    // 8. SSE 实时流式问诊（不消费 Idempotency-Key）
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/stream',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.WRITE);
      if (denied) return denied;

      const raw = await c.body();
      const parsed = messageSendSchema.safeParse(raw);
      if (!parsed.success) {
        return json(
          fail(ErrorCode.BAD_REQUEST, '入参非法：content 必填且不超过 4000 字符', c.traceId),
          400,
        );
      }

      let result: OrchestratorResult;
      try {
        const userId = c.user?.id ?? '';
        const profile = await repo.getProfile(userId);
        result = await handleConsultMessage(
          c.params.threadId,
          parsed.data.content,
          buildOrchestratorContext(c, repo, profile),
        );
      } catch (error) {
        return mapConsultError(error, c);
      }

      return openSseStream(buildSseFrames(result.events), c);
    },
  },

  {
    // 9. SSE 历史事件回放（按时间顺序重放持久化消息 / 草稿 / 审计）
    method: 'GET',
    path: '/api/v1/consult-agent/threads/:threadId/stream/replay',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.READ);
      if (denied) return denied;

      const threadResult = await findOwnedThread(c, c.params.threadId);
      if (threadResult instanceof Response) return threadResult;

      const threadId = c.params.threadId;
      const [messages, diagnosisDrafts, prescriptionDrafts, audits] = await Promise.all([
        repo.listMessages(threadId),
        repo.listDrafts(threadId, 'diagnosis'),
        repo.listDrafts(threadId, 'prescription'),
        repo.listAudit(threadId),
      ]);
      const drafts = [...diagnosisDrafts, ...prescriptionDrafts];

      type TimelineKind = 'message' | 'draft' | 'audit';
      interface TimelineEntry {
        createdAt: string;
        kind: TimelineKind;
        index: number;
        message?: ConsultMessage;
        draft?: ConsultDraft;
        audit?: ConsultAuditEntry;
      }
      const timeline: TimelineEntry[] = [
        ...messages.map((message, index) => ({
          createdAt: message.createdAt,
          kind: 'message' as const,
          index,
          message,
        })),
        ...drafts.map((draft, index) => ({
          createdAt: draft.createdAt,
          kind: 'draft' as const,
          index,
          draft,
        })),
        ...audits.map((audit, index) => ({
          createdAt: audit.createdAt,
          kind: 'audit' as const,
          index,
          audit,
        })),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.index - b.index);

      const replayEvents: SseEvent[] = [];
      for (const entry of timeline) {
        if (entry.kind === 'message' && entry.message) {
          const message = entry.message;
          if (message.toolCalls) {
            for (const call of message.toolCalls) {
              replayEvents.push({
                type: 'tool',
                stage: 'end',
                callId: call.callId,
                toolName: call.name,
                success: call.status === 'success',
                summary: call.summary ?? undefined,
                evidenceCount: call.evidenceCount,
              });
            }
          }
          replayEvents.push({ type: 'delta', text: message.content });
          if (message.disclaimer) {
            replayEvents.push({ type: 'disclaimer', text: message.disclaimer });
          }
        } else if (entry.kind === 'draft' && entry.draft) {
          replayEvents.push({ type: 'draft', draft: entry.draft });
        } else if (entry.kind === 'audit' && entry.audit) {
          const audit = entry.audit;
          if (audit.toolName && audit.toolStatus) {
            replayEvents.push({
              type: 'tool',
              stage: 'end',
              callId: audit.id,
              toolName: audit.toolName,
              success: audit.toolStatus === 'success',
              summary: typeof audit.detail.summary === 'string' ? audit.detail.summary : undefined,
              evidenceCount: audit.evidenceCount ?? undefined,
            });
          }
        }
      }

      const lastMessage = messages[messages.length - 1];
      replayEvents.push({ type: 'meta', confidence: 'medium', disclaimer: DISCLAIMER });
      replayEvents.push({ type: 'done', messageId: lastMessage?.id ?? '' });

      return openSseStream(buildSseFrames(replayEvents), c);
    },
  },

  {
    // 10. 草稿查询（kind ∈ diagnosis / prescription，取最新一条）
    method: 'GET',
    path: '/api/v1/consult-agent/threads/:threadId/drafts/:kind',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.READ);
      if (denied) return denied;

      const kind = c.params.kind;
      if (kind !== 'diagnosis' && kind !== 'prescription') {
        return json(
          fail(ErrorCode.BAD_REQUEST, '草稿类型仅支持 diagnosis / prescription', c.traceId),
          400,
        );
      }

      const threadResult = await findOwnedThread(c, c.params.threadId);
      if (threadResult instanceof Response) return threadResult;

      const drafts = await repo.listDrafts(c.params.threadId, kind);
      return json(ok({ draft: drafts[0] ?? null }, 'ok', c.traceId));
    },
  },

  {
    // 11. 用户画像事实
    method: 'GET',
    path: '/api/v1/consult-agent/profile',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.READ);
      if (denied) return denied;
      const profile = await repo.getProfile(c.user?.id ?? '');
      return json(ok({ facts: profile.facts }, 'ok', c.traceId));
    },
  },

  {
    // 12. 退出 / 关闭会话
    method: 'POST',
    path: '/api/v1/consult-agent/threads/:threadId/exit',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, CONSULT_AGENT_PERMISSIONS.WRITE);
      if (denied) return denied;

      const threadResult = await findOwnedThread(c, c.params.threadId);
      if (threadResult instanceof Response) return threadResult;

      const thread = threadResult;
      if (isTerminalStatus(thread.status)) {
        return json(fail(ErrorCode.CONFLICT, '咨询会话已结束或已关闭', c.traceId), 409);
      }

      thread.status = 'closed';
      thread.closedAt = nowIso();
      thread.updatedAt = nowIso();
      await repo.saveThread(thread);

      const exitAudit = createAuditEntry({
        threadId: thread.id,
        actorRole: 'user',
        action: 'thread_exit',
        traceId: c.traceId,
        detail: { via: 'exit_endpoint' },
      });
      await repo.saveAudit(exitAudit);

      return json(ok({ thread }, 'ok', c.traceId));
    },
  },
];
