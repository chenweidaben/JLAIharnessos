/**
 * 健澜科技 jlmedaios - 互联互通路由（M210-B）
 *
 * GET /api/v1/interoperability/report
 *
 * 权限：interoperability:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInteroperabilityReport } from '../aggregators/interoperabilityReportAggregator.js';

export const interoperabilityReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/interoperability/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'interoperability:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInteroperabilityReport(timeRange);
      return json(ok(result));
    },
  },
];
