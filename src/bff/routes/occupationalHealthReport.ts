/**
 * 健澜科技 jlmedaios - 职业病防治路由（M221-D）
 *
 * GET /api/v1/occupational-health/report
 *
 * 权限：occupational_health:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildOccupationalHealthReport } from '../aggregators/occupationalHealthReportAggregator.js';

export const occupationalHealthReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/occupational-health/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'occupational_health:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildOccupationalHealthReport(timeRange);
      return json(ok(result));
    },
  },
];
