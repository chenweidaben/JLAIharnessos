/**
 * 健澜科技 jlmedaios - 工会群团 V2 路由（M228-D）
 *
 * GET /api/v1/union/report-v2
 *
 * 权限：union:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildUnionReportV2 } from '../aggregators/unionReportV2Aggregator.js';

export const unionReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/union/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'union:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildUnionReportV2(timeRange);
      return json(ok(result));
    },
  },
];
