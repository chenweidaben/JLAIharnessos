/**
 * 健澜科技 jlmedaios - 人力资源 V2 路由（M211-C）
 *
 * GET /api/v1/hr/report-v2
 *
 * 权限：hr:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHRReportV2 } from '../aggregators/hrReportV2Aggregator.js';

export const hrReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/hr/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'hr:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHRReportV2(timeRange);
      return json(ok(result));
    },
  },
];
