/**
 * 健澜科技 jlmedaios - 医保 V3 路由（M205-C）
 *
 * GET /api/v1/insurance/report-v3
 *
 * 权限：insurance:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInsuranceReportV3 } from '../aggregators/insuranceReportV3Aggregator.js';

export const insuranceReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/insurance/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'insurance:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInsuranceReportV3(timeRange);
      return json(ok(result));
    },
  },
];
