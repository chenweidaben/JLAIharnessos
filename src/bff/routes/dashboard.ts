/**
 * 健澜科技数智医院智能体 - BFF 仪表盘路由
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { aggregateDashboard } from '../aggregators/dashboardAggregator';
import { json, ok, type RouteDef } from '../types';

export const dashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/dashboard/stats',
    handle: () => json(ok(aggregateDashboard())),
    auth: true,
  },
];
