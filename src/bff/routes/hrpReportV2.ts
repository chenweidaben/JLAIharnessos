/**
 * 健澜科技 jlmedaios - HRP V2 路由（M211-A）
 *
 * GET /api/v1/hrp/report-v2
 *
 * 权限：hrp:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHRPReportV2 } from '../aggregators/hrpReportV2Aggregator.js';

export const hrpReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/hrp/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'hrp:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHRPReportV2(timeRange);
      return json(ok(result));
    },
  },
];
