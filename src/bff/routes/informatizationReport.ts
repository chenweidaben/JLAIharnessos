/**
 * 健澜科技 jlmedaios - 信息化路由（M213-C）
 *
 * GET /api/v1/informatization/report
 *
 * 权限：informatization:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInformatizationReport } from '../aggregators/informatizationReportAggregator.js';

export const informatizationReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/informatization/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'informatization:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInformatizationReport(timeRange);
      return json(ok(result));
    },
  },
];
