/**
 * 健澜科技 jlmedaios - 系统设置与个人偏好 BFF 路由（M148-A · 产品化收尾）
 *
 *  - GET /api/v1/user/settings
 *      返回当前登录员工的完整个人偏好（通知 / 界面 / 助手 / 工作台）；
 *      从未设置过则返回开箱默认值，即时生效、无需刷新。
 *  - PUT /api/v1/user/settings/:key
 *      单键更新一条偏好：body 形如 { "value": true | "dark" | [...] }；
 *      key 走白名单校验，value 由聚合器按键收敛，非法输入回退默认。
 *
 * 权限：仅需登录（auth:true）；读写一律限定 staffId = c.user.id，
 *   不接受任何入参指定他人 ID，越权在接口层即被拒绝。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  getUserSettings,
  isValidSettingKey,
  updateUserSetting,
} from '../aggregators/userSettingsAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 未登录兜底响应 */
function needLogin(c: Ctx): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
}

/** PUT 单键更新请求体 */
interface UpdateSettingBody {
  value?: unknown;
}

export const userSettingsRoutes: RouteDef[] = [
  {
    // GET /api/v1/user/settings — 读取本人完整个人偏好
    method: 'GET',
    path: '/api/v1/user/settings',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const staffId = c.user.id;

      // 纯函数读取：未设置过自动落到默认偏好，不抛错
      const settings = getUserSettings(staffId);
      return json(
        ok(
          {
            staffId,
            settings,
            updatedAt: new Date().toISOString(),
          },
          'ok',
          c.traceId,
        ),
      );
    },
  },

  {
    // PUT /api/v1/user/settings/:key — 单键更新本人一条偏好（即时生效）
    method: 'PUT',
    path: '/api/v1/user/settings/:key',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const staffId = c.user.id;
      const key = (c.params.key ?? '').trim();

      // 白名单拦截未知偏好键，防止越键写入
      if (!isValidSettingKey(key)) {
        return json(
          fail(ErrorCode.BAD_REQUEST, `未知偏好键：${key}`, c.traceId),
          400,
        );
      }

      let body: UpdateSettingBody | null = null;
      try {
        body = (await c.body()) as UpdateSettingBody | null;
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }
      if (body === null || typeof body !== 'object' || !('value' in body)) {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体应为 { "value": ... }', c.traceId), 400);
      }

      // 纯函数按键收敛并写入运行时偏好库，返回更新后的完整偏好
      const settings = updateUserSetting(staffId, key, body.value);
      return json(
        ok(
          {
            staffId,
            key,
            settings,
            updatedAt: new Date().toISOString(),
          },
          '偏好已更新，即时生效',
          c.traceId,
        ),
      );
    },
  },
];
