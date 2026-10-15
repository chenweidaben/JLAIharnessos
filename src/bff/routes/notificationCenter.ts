/**
 * 健澜科技 jlmedaios - 统一通知中心 BFF 路由（M148-B · 产品化收尾）
 *
 * 产品理念：聚合通知，不能每个系统发一条。
 *
 *  - GET /api/v1/notifications
 *      当前登录医护本人的统一通知列表（按时间倒序）。
 *      可选 query：type（todo/alert/recommend/interact）、page（从 1 起）、pageSize（默认 20）。
 *      返回 items / total（受 type 筛选影响）/ unread（未读总数，供铃铛角标）/ page / pageSize。
 *  - PUT /api/v1/notifications/:id/read
 *      把本人的某条通知置为已读；非本人 / 不存在返回 404。
 *
 * 权限：仅需登录（auth:true）；读写一律限定 staff_id = c.user.id，
 *   不接受任何入参指定他人 staff_id，越权在接口层即被拒绝。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  getUnifiedNotifications,
  markNotificationRead,
  UNIFIED_NOTIFICATION_TYPES,
  type UnifiedNotificationType,
} from '../aggregators/notificationCenterAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 未登录兜底响应 */
function needLogin(c: Ctx): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
}

/** query 里的类型串收敛为合法枚举；非法 / 缺省返回 undefined（不按类型过滤） */
function parseType(raw: string | null): UnifiedNotificationType | undefined {
  if (!raw) return undefined;
  return UNIFIED_NOTIFICATION_TYPES.includes(raw as UnifiedNotificationType)
    ? (raw as UnifiedNotificationType)
    : undefined;
}

/** query 里的数字收敛为正整数；非法返回 undefined */
function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export const notificationCenterRoutes: RouteDef[] = [
  {
    // GET /api/v1/notifications — 本人统一通知列表（筛选 + 分页 + 未读数）
    method: 'GET',
    path: '/api/v1/notifications',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const staffId = c.user.id;

      try {
        const page = getUnifiedNotifications(
          staffId,
          parseType(c.query.get('type')),
          parsePositiveInt(c.query.get('page')),
          parsePositiveInt(c.query.get('pageSize')),
        );
        return json(ok(page, 'ok', c.traceId));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '统一通知中心加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },

  {
    // PUT /api/v1/notifications/:id/read — 把本人某条通知置为已读
    method: 'PUT',
    path: '/api/v1/notifications/:id/read',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const staffId = c.user.id;
      const id = (c.params.id ?? '').trim();
      if (!id) {
        return json(fail(ErrorCode.BAD_REQUEST, '通知 ID 不能为空', c.traceId), 400);
      }

      try {
        const updated = markNotificationRead(id, staffId);
        return json(ok(updated, '已标记为已读', c.traceId));
      } catch (e) {
        // 通知不存在 / 不属于本人 → 404（纯函数以抛错表达越权与未命中）
        return json(
          fail(ErrorCode.NOT_FOUND, e instanceof Error ? e.message : '通知不存在或不属于本人', c.traceId),
          404,
        );
      }
    },
  },
];
