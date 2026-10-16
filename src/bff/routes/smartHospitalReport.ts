/**
 * 健澜科技 jlmedaios - 智慧医院评价路由（M210-A）
 *
 * GET /api/v1/smart-hospital/report
 *
 * 权限：smart_hospital:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSmartHospitalReport } from '../aggregators/smartHospitalReportAggregator.js';

export const smartHospitalReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/smart-hospital/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'smart_hospital:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSmartHospitalReport(timeRange);
      return json(ok(result));
    },
  },
];
