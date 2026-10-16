/**
 * 健澜科技 jlmedaios - 个性化偏好与统一通知 BFF 路由（M158-D · 用户体验深化）
 *
 * v4.x近期：
 *  - GET /api/v1/user/preferences
 *      返回当前登录员工的完整个性化偏好、派生通知通道开关，以及一份按其
 *      已开启通道收敛后的统一收件箱（含未读数）；从未设置过则返回开箱默认值。
 *  - PUT /api/v1/user/preferences
 *      部分更新偏好：body 形如 { "preferences": { "theme": "light", ... } }；
 *      仅 patch 中出现的字段被收敛写回，其余原样保留，即时生效、无需刷新。
 *
 * 权限：仅需登录（auth:true）；读写一律限定 userId = c.user.id，
 *   不接受任何入参指定他人 ID，越权在接口层即被拒绝。
 * 不触碰 WebSocket，不新增依赖，不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  buildUserPreferences,
  getNotificationSettings,
  saveUserPreferences,
  unifyNotifications,
  type PreferencesPatch,
} from '../aggregators/userPrefAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 未登录兜底响应 */
function needLogin(c: Ctx): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
}

/** PUT 请求体：偏好片段 */
interface UpdatePrefBody {
  preferences?: PreferencesPatch;
}

export const userPrefRoutes: RouteDef[] = [
  {
    // GET /api/v1/user/preferences — 本人偏好 + 通知通道 + 统一收件箱
    method: 'GET',
    path: '/api/v1/user/preferences',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const userId = c.user.id;

      // 纯函数读取：未设置过自动落到默认偏好，不抛错
      const preferences = buildUserPreferences(userId);
      const notificationSettings = getNotificationSettings(userId);
      const inbox = unifyNotifications(userId);

      return json(
        ok(
          {
            userId,
            preferences,
            notificationSettings,
            inbox,
            unreadCount: inbox.filter((n) => !n.read).length,
            updatedAt: new Date().toISOString(),
          },
          'ok',
          c.traceId,
        ),
      );
    },
  },

  {
    // PUT /api/v1/user/preferences — 部分更新本人偏好（即时生效）
    method: 'PUT',
    path: '/api/v1/user/preferences',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const userId = c.user.id;

      let body: UpdatePrefBody | null = null;
      try {
        body = (await c.body()) as UpdatePrefBody | null;
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }
      if (body === null || typeof body !== 'object' || !('preferences' in body)) {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体应为 { "preferences": { ... } }', c.traceId), 400);
      }

      // 纯函数收敛并写入运行时偏好库，返回更新后的完整偏好
      const preferences = saveUserPreferences(userId, body.preferences ?? {});
      const notificationSettings = getNotificationSettings(userId);

      return json(
        ok(
          {
            userId,
            preferences,
            notificationSettings,
            updatedAt: new Date().toISOString(),
          },
          '偏好已更新，即时生效',
          c.traceId,
        ),
      );
    },
  },
];
