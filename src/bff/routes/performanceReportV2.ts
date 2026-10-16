/**
 * 健澜科技 jlmedaios - 绩效 V2 路由（M211-D）
 *
 * GET /api/v1/performance/report-v2
 *
 * 权限：performance:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPerformanceReportV2 } from '../aggregators/performanceReportV2Aggregator.js';

export const performanceReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/performance/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'performance:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPerformanceReportV2(timeRange);
      return json(ok(result));
    },
  },
];
