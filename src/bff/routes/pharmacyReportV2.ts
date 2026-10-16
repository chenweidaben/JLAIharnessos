/**
 * 健澜科技 jlmedaios - 药事 V2 路由（M212-D）
 *
 * GET /api/v1/pharmacy/report-v2
 *
 * 权限：pharmacy:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPharmacyReportV2 } from '../aggregators/pharmacyReportV2Aggregator.js';

export const pharmacyReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pharmacy/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'pharmacy:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPharmacyReportV2(timeRange);
      return json(ok(result));
    },
  },
];
