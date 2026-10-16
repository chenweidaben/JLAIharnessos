/**
 * 健澜科技 jlmedaios - SRE 路由（M216-D）
 *
 * GET /api/v1/sre/report
 *
 * 权限：sre:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSREReport } from '../aggregators/sreReportAggregator.js';

export const sreReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/sre/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'sre:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSREReport(timeRange);
      return json(ok(result));
    },
  },
];
