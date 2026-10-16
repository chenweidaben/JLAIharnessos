/**
 * 健澜科技 jlmedaios - 后勤安全路由（M213-B）
 *
 * GET /api/v1/logistics-safety/report
 *
 * 权限：logistics_safety:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLogisticsSafetyReport } from '../aggregators/logisticsSafetyReportAggregator.js';

export const logisticsSafetyReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/logistics-safety/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'logistics_safety:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLogisticsSafetyReport(timeRange);
      return json(ok(result));
    },
  },
];
