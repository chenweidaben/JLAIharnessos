/**
 * 健澜科技 jlmedaios - 国考绩效路由（M210-D）
 *
 * GET /api/v1/hospital-kpi/report
 *
 * 权限：hospital_kpi:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHospitalKPIReport } from '../aggregators/hospitalKPIReportAggregator.js';

export const hospitalKPIReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/hospital-kpi/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'hospital_kpi:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHospitalKPIReport(timeRange);
      return json(ok(result));
    },
  },
];
