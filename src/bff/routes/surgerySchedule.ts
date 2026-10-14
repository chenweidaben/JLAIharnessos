/**
 * 健澜科技 jlmedaios - 手术排程看板路由
 *
 * GET /api/v1/surgery/schedule?date=YYYY-MM-DD
 * 日视图（手术间×时间网格）+ 周视图；无排程数据时返回 demo:true 演示行。
 * 只读查询，复用既有权限码 surgery:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listView } from '../aggregators/surgeryScheduleAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

export const surgeryScheduleRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/surgery/schedule',
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'surgery:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        const date = c.query.get('date') ?? '';
        return json(ok(await listView(date)));
      } catch (err) {
        const message = err instanceof Error ? err.message : '手术排程看板加载失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
    auth: true,
  },
];
