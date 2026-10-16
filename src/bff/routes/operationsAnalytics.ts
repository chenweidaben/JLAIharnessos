/**
 * 健澜科技 jlmedaios - 运营数据分析路由（M189-D）
 *
 * GET /api/v1/admin/operations-analytics/report
 *
 * 权限：operations:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildOperationsAnalyticsReport } from '../aggregators/operationsAnalyticsAggregator.js';

export const operationsAnalyticsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/operations-analytics/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'operations:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildOperationsAnalyticsReport(timeRange);
      return json(ok(result));
    },
  },
];
