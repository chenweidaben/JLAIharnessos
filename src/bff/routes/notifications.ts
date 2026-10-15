/**
 * 健澜科技 jlmedaios - 医护统一消息通知中心 BFF 路由（M134-C · 用户体验深化）
 *
 * 理念：不要太吵，重要通知才推送。
 *
 *  - GET /api/v1/user/notifications
 *      当前登录医护本人的通知列表（按时间倒序）。
 *      可选 query：type（todo_task/system_alert/experience_rec/peer_interact）、
 *                 unreadOnly（true=只看未读）、page（从 1 起）、pageSize（默认 20）。
 *      返回 items / total（受筛选影响）/ unread（未读总数，供铃铛角标）/ page / pageSize。
 *  - PUT /api/v1/user/notifications/:id/read
 *      把本人的某条通知置为已读；非本人 / 不存在返回 404。
 *
 * 权限：仅需登录（auth:true）；读写一律限定 staff_id = c.user.id，
 *   不接受任何入参指定他人 staff_id，越权在接口层即被拒绝。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  listNotifications,
  markNotificationRead,
  NOTIFICATION_TYPES,
  type NotificationType,
} from '../aggregators/notificationAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 未登录兜底响应 */
function needLogin(c: Ctx): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
}

/** query 里的类型串收敛为合法枚举；非法 / 缺省返回 undefined（不按类型过滤） */
function parseType(raw: string | null): NotificationType | undefined {
  if (!raw) return undefined;
  return NOTIFICATION_TYPES.includes(raw as NotificationType)
    ? (raw as NotificationType)
    : undefined;
}

/** query 里的数字收敛为正整数；非法返回 undefined */
function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export const notificationRoutes: RouteDef[] = [
  {
    // GET /api/v1/user/notifications — 本人通知列表（筛选 + 分页 + 未读数）
    method: 'GET',
    path: '/api/v1/user/notifications',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const staffId = c.user.id;

      try {
        const view = await listNotifications(staffId, {
          type: parseType(c.query.get('type')),
          unreadOnly: c.query.get('unreadOnly') === 'true',
          page: parsePositiveInt(c.query.get('page')),
          pageSize: parsePositiveInt(c.query.get('pageSize')),
        });
        return json(ok(view, 'ok', c.traceId));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '通知中心加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },

  {
    // PUT /api/v1/user/notifications/:id/read — 把本人某条通知置为已读
    method: 'PUT',
    path: '/api/v1/user/notifications/:id/read',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const staffId = c.user.id;
      const id = (c.params.id ?? '').trim();
      if (!id) {
        return json(fail(ErrorCode.BAD_REQUEST, '通知 ID 不能为空', c.traceId), 400);
      }

      try {
        const updated = await markNotificationRead(staffId, id);
        if (!updated) {
          return json(
            fail(ErrorCode.NOT_FOUND, '通知不存在、不属于本人或已读', c.traceId),
            404,
          );
        }
        return json(ok(updated, '已标记为已读', c.traceId));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '已读标记失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
