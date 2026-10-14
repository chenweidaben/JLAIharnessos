/**
 * 健澜科技 jlmedaios - 科室月度运营报表路由
 * GET /api/v1/monthly-report?month=YYYY-MM（仅需登录，不设独立权限码）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { currentMonth, generateView } from '../aggregators/monthlyReportAggregator';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

export const monthlyReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/monthly-report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);

      const month = c.query.get('month')?.trim() || currentMonth();
      if (!MONTH_RE.test(month)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'month 需为 YYYY-MM 格式'), 400);
      }

      // 演示模式：返回确定性演示数据（demo:true）
      return json(ok(generateView(month)));
    },
  },
];
