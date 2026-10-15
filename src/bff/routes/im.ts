/**
 * 健澜科技 jlmedaios - 医院内部即时通讯 BFF 路由（M138-C）
 *
 * 【新业务场景】医护内部点对点 IM 的 REST 出入口（拉取式，不碰 WebSocket）：
 *
 *  - POST /api/v1/im/send
 *      发消息。body: { receiverId, content, type? }；sender 恒为当前登录用户 c.user.id。
 *      type ∈ text/image/file/system，越界由聚合器回退 text；消息体加密存储。
 *  - GET /api/v1/im/conversation/:otherId
 *      拉取与某同事的双人会话消息（按时间正序分页）。
 *      可选 query：page（从 1 起，默认 1）、pageSize（默认 20，上限 100）。
 *  - GET /api/v1/im/unread-count
 *      当前登录用户的未读消息总数（供导航栏角标）。
 *
 * 权限：仅需登录（auth:true）；发消息时 sender 强制 = c.user.id，
 *   不接受任何入参冒充他人发送；会话查询以本人为一侧。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  getConversation,
  getUnreadCount,
  sendMessage,
  type ImMessage,
} from '../aggregators/imAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 未登录兜底响应 */
function needLogin(c: Ctx): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
}

/** query 里的数字收敛为正整数；非法 / 缺省返回 undefined */
function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export const imRoutes: RouteDef[] = [
  {
    // POST /api/v1/im/send — 发消息（sender 强制 = 当前登录用户）
    method: 'POST',
    path: '/api/v1/im/send',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const senderId = c.user.id;

      const body = await c.body<{ receiverId?: string; content?: string; type?: string }>();
      const receiverId = (body.receiverId ?? '').trim();
      const content = (body.content ?? '').trim();
      if (!receiverId) {
        return json(fail(ErrorCode.BAD_REQUEST, '接收人 receiverId 不能为空', c.traceId), 400);
      }
      if (!content) {
        return json(fail(ErrorCode.BAD_REQUEST, '消息内容 content 不能为空', c.traceId), 400);
      }

      try {
        const message: ImMessage = sendMessage(
          senderId,
          receiverId,
          content,
          body.type ?? 'text',
        );
        return json(ok(message, '消息已发送', c.traceId));
      } catch (e) {
        const msg = e instanceof Error ? e.message : '消息发送失败';
        // 编程类错误（自发给自己 / 空 ID）归为 400，便于前端纠正
        return json(fail(ErrorCode.BAD_REQUEST, msg, c.traceId), 400);
      }
    },
  },

  {
    // GET /api/v1/im/conversation/:otherId — 双人会话分页消息
    method: 'GET',
    path: '/api/v1/im/conversation/:otherId',
    auth: true,
    handle: (c: Ctx): Response => {
      if (!c.user) return needLogin(c);
      const userId = c.user.id;
      const otherId = (c.params.otherId ?? '').trim();
      if (!otherId) {
        return json(fail(ErrorCode.BAD_REQUEST, '会话对方 otherId 不能为空', c.traceId), 400);
      }

      const messages = getConversation(
        userId,
        otherId,
        parsePositiveInt(c.query.get('page')),
        parsePositiveInt(c.query.get('pageSize')),
      );
      return json(ok(messages, 'ok', c.traceId));
    },
  },

  {
    // GET /api/v1/im/unread-count — 当前用户未读消息总数
    method: 'GET',
    path: '/api/v1/im/unread-count',
    auth: true,
    handle: (c: Ctx): Response => {
      if (!c.user) return needLogin(c);
      const count = getUnreadCount(c.user.id);
      return json(ok({ count }, 'ok', c.traceId));
    },
  },
];
