/**
 * 健澜科技 jlmedaios - 生产性能优化路由（M187-A）
 *
 * GET /api/v1/admin/performance/report
 *
 * 权限：performance:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPerformanceReport } from '../aggregators/performanceReportAggregator.js';

export const performanceReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'performance:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '24h';
      const result = buildPerformanceReport(timeRange);
      return json(ok(result));
    },
  },
];
