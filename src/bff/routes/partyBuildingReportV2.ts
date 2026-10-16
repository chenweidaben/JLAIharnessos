/**
 * 健澜科技 jlmedaios - 党建 V2 路由（M228-A）
 *
 * GET /api/v1/party-building/report-v2
 *
 * 权限：party-building:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPartyBuildingReportV2 } from '../aggregators/partyBuildingReportV2Aggregator.js';

export const partyBuildingReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/party-building/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'party-building:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPartyBuildingReportV2(timeRange);
      return json(ok(result));
    },
  },
];
