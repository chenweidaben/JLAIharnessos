/**
 * 健澜科技 jlmedaios - 成本核算路由（M189-B）
 *
 * GET /api/v1/admin/cost-accounting/report
 *
 * 权限：cost_accounting:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildCostAccountingReport } from '../aggregators/costAccountingAggregator.js';

export const costAccountingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/cost-accounting/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'cost_accounting:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '心内科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildCostAccountingReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
