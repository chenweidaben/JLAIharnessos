/**
 * 健澜科技数智医院智能体 - BFF 对话路由（REST，真实持久化）
 *
 *  - GET    /api/v1/chat/conversations                  会话列表
 *  - POST   /api/v1/chat/conversations                  创建会话
 *  - POST   /api/v1/chat/conversations/:id/messages     发送消息（支持 SSE 流式）
 *  - GET    /api/v1/chat/conversations/:id/messages      消息历史
 *
 * WebSocket 升级在 server.ts 统一处理（/ws/chat）。
 * 所有消息经 conversationRepo 落库 agent.conversations / agent.conversation_messages。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { runChatTurn } from '../aggregators/chatAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  createConversation,
  getConversationById,
  getMessagesByConversation,
  listConversations,
} from '@/db/repositories/conversationRepo';

const RECENT_MESSAGE_LIMIT = 200;

export const chatRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/chat/conversations',
    handle: async (c: Ctx) => {
      const list = await listConversations({ userId: c.user?.id, limit: 50 });
      return json(ok(list, 'ok', c.traceId));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/chat/conversations',
    handle: async (c: Ctx) => {
      const body = await c.body<{
        title?: string;
        patientId?: string;
        encounterId?: string;
      }>();
      const metadata: Record<string, unknown> = {};
      if (body.encounterId) metadata.encounterId = body.encounterId;
      const conv = await createConversation({
        userId: c.user?.id ?? null,
        patientId: body.patientId || null,
        title: body.title?.trim() || '门诊对话',
        metadata,
      });
      return json(ok(conv, 'ok', c.traceId));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/chat/conversations/:id/messages',
    handle: async (c: Ctx) => {
      const conversationId = c.params.id;
      const conv = await getConversationById(conversationId);
      if (!conv) {
        return json(
          fail(ErrorCode.NOT_FOUND, `会话不存在: ${conversationId}`, c.traceId),
          404,
        );
      }

      const body = await c.body<{ content?: string }>();
      const content = (body.content ?? '').trim();
      if (!content) {
        return json(fail(ErrorCode.BAD_REQUEST, '消息内容不能为空', c.traceId), 400);
      }

      // 从会话元数据恢复就诊关联，驱动真实患者上下文注入
      const encounterId = (conv.metadata?.encounterId as string | undefined) ?? null;

      // SSE 流式：Accept: text/event-stream 时实时推送增量
      const accept = c.req.headers.get('Accept') ?? '';
      if (accept.includes('text/event-stream')) {
        return streamResponse(c, conversationId, content, encounterId);
      }

      // 非流式：等待整轮完成后返回完整结果
      const result = await runChatTurn(conversationId, content, {
        userId: c.user?.id,
        userName: c.user?.name,
        encounterId,
      });
      if (result.error) {
        return json(
          fail(ErrorCode.SERVICE_UNAVAILABLE, result.error.message, c.traceId),
          503,
        );
      }
      return json(ok(result, 'ok', c.traceId));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/chat/conversations/:id/messages',
    handle: async (c: Ctx) => {
      const conversationId = c.params.id;
      const conv = await getConversationById(conversationId);
      if (!conv) {
        return json(
          fail(ErrorCode.NOT_FOUND, `会话不存在: ${conversationId}`, c.traceId),
          404,
        );
      }
      const messages = await getMessagesByConversation(conversationId, {
        limit: RECENT_MESSAGE_LIMIT,
      });
      return json(ok(messages, 'ok', c.traceId));
    },
    auth: true,
  },
];

/**
 * SSE 流式响应：
 *   data: {"type":"delta","text":"..."}
 *   data: {"type":"tool","stage":"start","toolName":"..."}
 *   data: {"type":"done","message":{...},"toolCalls":[...]}
 *   data: [DONE]
 */
function streamResponse(
  c: Ctx,
  conversationId: string,
  content: string,
  encounterId: string | null,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        const result = await runChatTurn(conversationId, content, {
          userId: c.user?.id,
          userName: c.user?.name,
          encounterId,
          onDelta: (text) => send({ type: 'delta', text }),
          onToolEvent: (ev) => send({ type: 'tool', ...ev }),
        });
        if (result.error) {
          send({ type: 'error', code: result.error.code, message: result.error.message });
        } else {
          send({ type: 'done', message: result.message, toolCalls: result.toolCalls });
        }
      } catch (e) {
        send({
          type: 'error',
          code: 'STREAM_FAILED',
          message: e instanceof Error ? e.message : String(e),
        });
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
