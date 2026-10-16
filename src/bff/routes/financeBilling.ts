/**
 * 健澜科技 jlmedaios - 财务收费管理路由（M192-A）
 *
 * GET /api/v1/admin/finance/report
 *
 * 权限：finance:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildFinanceBillingReport } from '../aggregators/financeBillingAggregator.js';

export const financeBillingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/finance/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'finance:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '财务处';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildFinanceBillingReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
