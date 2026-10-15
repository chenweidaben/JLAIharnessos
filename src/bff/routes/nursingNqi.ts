/**
 * 健澜科技 jlmedaios - 护理敏感质量指标（NQI）月度趋势 BFF 路由
 *
 * GET /api/v1/nursing/nqi：返回跌倒/压疮/管路滑脱/给药错误的月度趋势。
 * 仅要求登录（auth: true），不细分权限码；当前返回离线演示数据（demo: true），
 * 后续接入真实事件库时由 aggregator 切换。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/nursingNqiAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

export const nursingNqiRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nursing/nqi',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        return json(ok(listView()));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '护理敏感指标加载失败'),
          500,
        );
      }
    },
  },
];
