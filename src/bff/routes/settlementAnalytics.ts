/**
 * 健澜科技 jlmedaios - 结算分析路由（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { analyticsView, SettlementAnalyticsError } from '../aggregators/settlementAnalyticsAggregator';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof SettlementAnalyticsError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '结算分析失败'), 500);
}

export const settlementAnalyticsRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/settlement-analytics',
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'settlement_analytics:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);
      try {
        const months = Number(c.query.get('months') ?? 12);
        return json(ok(await analyticsView(view, Number.isFinite(months) ? months : 12)));
      } catch (err) { return mapError(err); }
    }, auth: true },
];
