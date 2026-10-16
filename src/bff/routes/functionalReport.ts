/**
 * 健澜科技 jlmedaios - 功能检查中心路由（M223-D）
 *
 * GET /api/v1/functional/report
 *
 * 权限：functional:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildFunctionalReport } from '../aggregators/functionalReportAggregator.js';

export const functionalReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/functional/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'functional:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildFunctionalReport(timeRange);
      return json(ok(result));
    },
  },
];
