/**
 * 健澜科技数智医院智能体 - BFF 院长驾驶舱路由（M9-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { aggregateDashboard } from '../aggregators/dashboardAggregator';
import { json, ok, type Ctx, type RouteDef } from '../types';

export const dashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/dashboard/stats',
    handle: async (c: Ctx) => {
      const denied = requireAuth(c);
      if (denied) return denied;
      const days = Number(c.query.get('days') ?? '14');
      const trendDays = Number.isFinite(days) && days >= 1 ? Math.min(days, 90) : 14;
      const stats = await aggregateDashboard(trendDays);
      return json(ok(stats));
    },
    auth: true,
  },
];
