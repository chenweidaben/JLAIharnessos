/**
 * 健澜科技 jlmedaios - 环境保护路由（M220-B）
 *
 * GET /api/v1/environment/report
 *
 * 权限：environment:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildEnvironmentReport } from '../aggregators/environmentReportAggregator.js';

export const environmentReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/environment/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'environment:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildEnvironmentReport(timeRange);
      return json(ok(result));
    },
  },
];
