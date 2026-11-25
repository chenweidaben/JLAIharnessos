/**
 * 健澜AI原生医院操作系统OS - /ws/chat WebSocket 模块
 *
 * 自 server.ts 拆分（god-file 治理）：连接集管理、广播、升级鉴权、
 * agent:start 流式对话处理与 Bun websocket 生命周期处理器。
 *
 * 安全要点：
 *  - 升级握手鉴权（JWT / 开发态演示 token），通过后用户身份挂到连接 data；
 *  - agent:start 校验会话归属，防跨用户读写（IDOR）；
 *  - 内部错误详情只落服务端日志，不下发客户端。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { verifyJwt } from './middleware/auth';
import { isProductionEnv } from './config/runtimeEnv';
import { runChatTurn } from './aggregators/chatAggregator';
import { metrics } from './observability/metrics';
import {
  createConversation,
  getConversationById,
} from '@/db/repositories/conversationRepo';

export const chatClients = new Set<Bun.ServerWebSocket<unknown>>();

export function broadcast(event: string, payload: unknown, seq?: number): void {
  // seq 为 outbox 数字主键（仅经发件箱发布的事件携带），客户端据此重连补拉
  const frame = JSON.stringify({
    event,
    timestamp: Date.now(),
    payload,
    ...(seq !== undefined ? { seq } : {}),
  });
  for (const ws of chatClients) {
    try {
      ws.send(frame);
    } catch {
      chatClients.delete(ws);
    }
  }
}

/**
 * 校验 WebSocket 升级请求的 Token（query 参数 ?token= 或 Sec-WebSocket-Protocol），
 * 通过则返回用户身份；失败返回 null。
 * 注：query token 会进入访问日志/代理日志，推荐客户端使用 Sec-WebSocket-Protocol: bearer.<jwt>。
 */
export function wsAuthorize(req: Request): { id: string; name: string; roles: string[] } | null {
  const url = new URL(req.url);
  const token =
    url.searchParams.get('token') ??
    (req.headers.get('sec-websocket-protocol') ?? '').replace(/^bearer\./i, '');
  if (!token) return null;
  // JWT 格式
  if (token.split('.').length === 3) {
    const payload = verifyJwt(token);
    return payload ? { id: payload.sub, name: payload.name, roles: payload.roles ?? [] } : null;
  }
  // 开发态演示 token（仅非生产环境）
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (
    !isProd &&
    (token.startsWith('jt-') || token.startsWith('jr-') || token === 'bff-access-token')
  ) {
    return { id: 'u_1001', name: '陈维', roles: ['admin'] };
  }
  return null;
}

/** 前端向 /ws/chat 下发的帧（兼容 event / action、顶层 / payload 两种位置） */
export interface IncomingFrame {
  event?: string;
  action?: string;
  conversationId?: string;
  content?: string;
  payload?: { conversationId?: string; content?: string };
}

/**
 * agent:start 处理：会话不存在则创建，调用 chatAggregator.runChatTurn 跑真实 LLM。
 * 流式增量以 agent:delta 推送，结束推 agent:done（失败推 agent:error）。
 * 所有消息在 runChatTurn 内部落库。
 */
export async function handleAgentStart(
  ws: Bun.ServerWebSocket<unknown>,
  frame: IncomingFrame,
): Promise<void> {
  // 升级时已鉴权并挂载用户身份；缺失则直接拒绝（防御性兜底）
  const wsUser = (ws.data as { user?: { id: string; name: string; roles: string[] } } | undefined)?.user;
  if (!wsUser) {
    try {
      ws.send(JSON.stringify({ event: 'agent:error', timestamp: Date.now(), payload: { code: 'UNAUTHORIZED', message: '连接未鉴权' } }));
      ws.close(4001, 'unauthorized');
    } catch { /* ws 已关闭 */ }
    return;
  }
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let conversationId = frame.conversationId ?? frame.payload?.conversationId ?? '';
  // 前端 agent:start 通常只带 conversationId；缺省让 LLM 产出真实问候，避免空消息报错
  const content = (frame.payload?.content ?? frame.content ?? '').trim() || '您好，请介绍一下健澜AI原生医院操作系统OS可以为我提供哪些临床辅助能力。';

  const send = (event: string, payload: unknown): void => {
    try {
      ws.send(JSON.stringify({ event, timestamp: Date.now(), payload }));
    } catch {
      /* ws 已关闭 */
    }
  };

  try {
    // 会话不存在则先创建；已存在则校验归属，防止跨用户读写他人会话（IDOR）
    let conv = conversationId ? await getConversationById(conversationId) : null;
    if (conv?.userId && conv.userId !== wsUser.id) {
      // 历史遗留：旧版本以 'ws-user' 占位创建的会话，仅非生产环境放行
      const legacy = conv.userId === 'ws-user' && !isProductionEnv();
      if (!legacy) {
        send('agent:error', {
          conversationId,
          messageId,
          code: 'FORBIDDEN',
          message: '无权访问该会话',
        });
        send('agent:done', { conversationId, messageId });
        return;
      }
    }
    if (!conv) {
      conv = await createConversation({ userId: wsUser.id, title: 'WebSocket 会话' });
      conversationId = conv.id;
      send('agent:conversation', { conversationId });
    }

    const result = await runChatTurn(conversationId, content, {
      onDelta: (delta) =>
        send('agent:delta', { conversationId, messageId, delta, done: false }),
      onToolEvent: (ev) => send('agent:tool', { conversationId, messageId, ...ev }),
    });

    if (result.error) {
      send('agent:error', {
        conversationId,
        messageId,
        code: result.error.code,
        message: result.error.message,
      });
    }
    send('agent:done', { conversationId, messageId });
  } catch (e) {
    // 内部错误详情只落服务端日志，不下发原始 message（防内部实现细节外泄）
    // eslint-disable-next-line no-console
    console.error('[ws] agent:start 处理失败:', e);
    send('agent:error', {
      conversationId,
      messageId,
      code: 'AGENT_FAILED',
      message: '对话处理失败，请稍后重试',
    });
    send('agent:done', { conversationId, messageId });
  }
}

/** 生成 Bun.serve 的 websocket 生命周期处理器 */
export function createWsHandlers(): {
  open: (ws: Bun.ServerWebSocket<unknown>) => void;
  message: (ws: Bun.ServerWebSocket<unknown>, raw: string | Buffer) => void;
  close: (ws: Bun.ServerWebSocket<unknown>) => void;
} {
  return {
    open(ws) {
      chatClients.add(ws);
      metrics.wsConnections.inc();
    },
    message(ws: Bun.ServerWebSocket<unknown>, raw: string | Buffer) {
      let parsed: IncomingFrame = {};
      try {
        parsed = JSON.parse(String(raw)) as IncomingFrame;
      } catch {
        /* ignore */
      }
      // 兼容前端事件帧（event）与早期 action
      const kind = parsed.event ?? parsed.action;

      if (kind === 'heartbeat' || kind === 'ping') {
        ws.send(
          JSON.stringify({ event: 'heartbeat', timestamp: Date.now(), payload: { ok: true } }),
        );
        return;
      }

      if (kind === 'agent:start' || kind === 'start_stream') {
        // 真实 LLM 流式：会话不存在则创建，runChatTurn 内部落库并回调推送
        void handleAgentStart(ws, parsed);
      }
    },
    close(ws) {
      chatClients.delete(ws);
      metrics.wsConnections.dec();
    },
    };
}
