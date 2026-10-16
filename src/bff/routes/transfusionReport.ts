/**
 * 健澜科技 jlmedaios - 输血管理路由（M224-C）
 *
 * GET /api/v1/transfusion/report
 *
 * 权限：transfusion:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTransfusionReport } from '../aggregators/transfusionReportAggregator.js';

export const transfusionReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/transfusion/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'transfusion:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTransfusionReport(timeRange);
      return json(ok(result));
    },
  },
];
