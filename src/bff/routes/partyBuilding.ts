/**
 * 健澜科技 jlmedaios - 党建管理路由（M194-A）
 *
 * GET /api/v1/admin/party-building/report
 *
 * 权限：party_building:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPartyBuildingReport } from '../aggregators/partyBuildingAggregator.js';

export const partyBuildingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/party-building/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'party_building:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '党委办公室';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPartyBuildingReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
