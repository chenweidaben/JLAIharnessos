/**
 * 健澜科技 jlmedaios - 区域医联体路由（M206-C）
 *
 * GET /api/v1/regional/report
 *
 * 权限：regional:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildRegionalHealthReport } from '../aggregators/regionalHealthAggregator.js';

export const regionalHealthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/regional/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'regional:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildRegionalHealthReport(timeRange);
      return json(ok(result));
    },
  },
];
