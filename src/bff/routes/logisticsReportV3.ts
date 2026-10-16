/**
 * 健澜科技 jlmedaios - 后勤 V3 路由（M207-D）
 *
 * GET /api/v1/logistics/report-v3
 *
 * 权限：logistics:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLogisticsReportV3 } from '../aggregators/logisticsReportV3Aggregator.js';

export const logisticsReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/logistics/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'logistics:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLogisticsReportV3(timeRange);
      return json(ok(result));
    },
  },
];
