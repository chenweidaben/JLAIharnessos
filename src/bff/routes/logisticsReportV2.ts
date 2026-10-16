/**
 * 健澜科技 jlmedaios - 后勤基建 V2 路由（M220-A）
 *
 * GET /api/v1/logistics/report-v2
 *
 * 权限：logistics:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLogisticsReportV2 } from '../aggregators/logisticsReportV2Aggregator.js';

export const logisticsReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/logistics/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'logistics:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLogisticsReportV2(timeRange);
      return json(ok(result));
    },
  },
];
