/**
 * 健澜科技 jlmedaios - 风险管理路由（M217-D）
 *
 * GET /api/v1/risk/report
 *
 * 权限：risk:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildRiskReport } from '../aggregators/riskReportAggregator.js';

export const riskReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/risk/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'risk:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildRiskReport(timeRange);
      return json(ok(result));
    },
  },
];
