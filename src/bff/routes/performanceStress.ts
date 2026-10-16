/**
 * 健澜科技 jlmedaios - 性能压测路由（M193-A）
 *
 * GET /api/v1/admin/performance/stress-test
 *
 * 权限：performance:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPerformanceStressTestReport } from '../aggregators/performanceStressAggregator.js';

export const performanceStressRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/performance/stress-test',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'performance:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '7d';
      const result = buildPerformanceStressTestReport(timeRange);
      return json(ok(result));
    },
  },
];
