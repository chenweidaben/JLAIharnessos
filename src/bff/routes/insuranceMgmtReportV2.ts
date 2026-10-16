/**
 * 健澜科技 jlmedaios - 医保管理 V2 路由（M226-A）
 *
 * GET /api/v1/insurance/report-v2
 *
 * 权限：insurance:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInsuranceMgmtReportV2 } from '../aggregators/insuranceMgmtReportV2Aggregator.js';

export const insuranceMgmtReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/insurance/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'insurance:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInsuranceMgmtReportV2(timeRange);
      return json(ok(result));
    },
  },
];
