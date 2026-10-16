/**
 * 健澜科技 jlmedaios - 党建行政路由（M212-A）
 *
 * GET /api/v1/party-admin/report
 *
 * 权限：party_admin:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPartyAdminReport } from '../aggregators/partyAdminReportAggregator.js';

export const partyAdminReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/party-admin/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'party_admin:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPartyAdminReport(timeRange);
      return json(ok(result));
    },
  },
];
