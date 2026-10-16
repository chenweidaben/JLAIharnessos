/**
 * 健澜科技 jlmedaios - 安宁疗护路由（M220-D）
 *
 * GET /api/v1/hospice/report
 *
 * 权限：hospice:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHospiceReport } from '../aggregators/hospiceReportAggregator.js';

export const hospiceReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/hospice/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'hospice:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHospiceReport(timeRange);
      return json(ok(result));
    },
  },
];
