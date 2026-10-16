/**
 * 健澜科技 jlmedaios - 财务 V2 路由（M211-B）
 *
 * GET /api/v1/finance/report-v2
 *
 * 权限：finance:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildFinanceReportV2 } from '../aggregators/financeReportV2Aggregator.js';

export const financeReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/finance/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'finance:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildFinanceReportV2(timeRange);
      return json(ok(result));
    },
  },
];
