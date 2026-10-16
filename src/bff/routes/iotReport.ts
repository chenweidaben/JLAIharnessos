/**
 * 健澜科技 jlmedaios - 物联网路由（M215-C）
 *
 * GET /api/v1/iot/report
 *
 * 权限：iot:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildIoTReport } from '../aggregators/iotReportAggregator.js';

export const iotReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/iot/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'iot:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildIoTReport(timeRange);
      return json(ok(result));
    },
  },
];
