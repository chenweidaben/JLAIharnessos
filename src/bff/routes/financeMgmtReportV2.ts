/**
 * 健澜科技 jlmedaios - 财务核算 V2 路由（M226-C）
 *
 * GET /api/v1/finance/report-v2
 *
 * 权限：finance:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildFinanceMgmtReportV2 } from '../aggregators/financeMgmtReportV2Aggregator.js';

export const financeMgmtReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/finance/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'finance:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildFinanceMgmtReportV2(timeRange);
      return json(ok(result));
    },
  },
];
