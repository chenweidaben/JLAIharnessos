/**
 * 健澜科技数智医院智能体 - BFF 对话路由（REST）
 *
 * WebSocket 升级在 server.ts 统一处理（/ws/chat）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { runChatTurn } from '../aggregators/chatAggregator';
import { type Ctx, json, ok, type RouteDef } from '../types';

export const chatRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/chat/conversations',
    handle: () => json(ok([])),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/chat/conversations',
    handle: async (c: Ctx) => {
      const body = await c.body<{ title?: string }>();
      return json(
        ok({
          id: `c_${Date.now()}`,
          title: body.title ?? '新对话',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 0,
        }),
      );
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/chat/conversations/:id/messages',
    handle: async (c: Ctx) => {
      const body = await c.body<{ content?: string }>();
      const turn = runChatTurn(c.params.id, body.content ?? '');
      return json(ok(turn));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/chat/conversations/:id/messages',
    handle: () => json(ok([])),
    auth: true,
  },
];
