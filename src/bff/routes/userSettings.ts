/**
 * 健澜科技 jlmedaios - 用户个人设置 BFF 路由（M132-D · 产品化收尾）
 *
 *  - GET /api/v1/user/settings
 *      返回当前登录用户的个人设置；从未保存过则按其角色产出默认设置，
 *      并以 isDefault=true 标识（前端可据此提示「尚未自定义」）。
 *  - PUT /api/v1/user/settings
 *      分类级部分更新：body 可只携带某几个分类，未携带分类原样保留；
 *      落库前经纯函数 mergeSettings 收敛，非法枚举 / 类型自动回退默认。
 *
 * 权限：仅需登录（auth:true）；读写一律限定 user_id = c.user.id，
 *   不接受任何入参指定他人 user_id，越权在接口层即被拒绝。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  getDefaultSettings,
  getUserSettings,
  mergeSettings,
  saveUserSettings,
  type SettingsPatch,
} from '../aggregators/userSettingsAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 取当前用户主角色（roles 数组首项），空则回退空串 */
function primaryRole(c: Ctx): string {
  return c.user?.roles?.[0] ?? '';
}

/** 未登录兜底响应 */
function needLogin(c: Ctx): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
}

export const userSettingsRoutes: RouteDef[] = [
  {
    // GET /api/v1/user/settings — 读取本人个人设置
    method: 'GET',
    path: '/api/v1/user/settings',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const userId = c.user.id;

      try {
        const stored = await getUserSettings(userId);
        if (stored) {
          return json(
            ok({
              userId,
              settings: stored.settings,
              updatedAt: stored.updatedAt,
              isDefault: false,
            }),
          );
        }
        // 无记录：按角色给默认设置，不写库
        const settings = getDefaultSettings(primaryRole(c));
        return json(
          ok({
            userId,
            settings,
            updatedAt: new Date().toISOString(),
            isDefault: true,
          }),
        );
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '个人设置加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },

  {
    // PUT /api/v1/user/settings — 分类级部分更新本人个人设置
    method: 'PUT',
    path: '/api/v1/user/settings',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return needLogin(c);
      const userId = c.user.id;

      let body: SettingsPatch | null = null;
      try {
        body = (await c.body()) as SettingsPatch | null;
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }
      if (body === null || typeof body !== 'object') {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不能为空', c.traceId), 400);
      }

      try {
        // 以「已存设置」或「角色默认」为当前基线，再叠加本次分类级增量
        const stored = await getUserSettings(userId);
        const base = stored?.settings ?? getDefaultSettings(primaryRole(c));
        const merged = mergeSettings(base, body);

        await saveUserSettings(userId, merged);
        return json(
          ok(
            {
              userId,
              settings: merged,
              updatedAt: new Date().toISOString(),
              isDefault: false,
            },
            '个人设置已保存',
            c.traceId,
          ),
        );
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '个人设置保存失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
