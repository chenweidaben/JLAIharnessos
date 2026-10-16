/**
 * 健澜科技 jlmedaios - 智慧药房路由（M214-D）
 *
 * GET /api/v1/smart-pharmacy/report
 *
 * 权限：smart_pharmacy:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSmartPharmacyReport } from '../aggregators/smartPharmacyReportAggregator.js';

export const smartPharmacyReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/smart-pharmacy/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'smart_pharmacy:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSmartPharmacyReport(timeRange);
      return json(ok(result));
    },
  },
];
