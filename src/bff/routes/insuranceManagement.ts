/**
 * 健澜科技 jlmedaios - 医保管理路由（M192-B）
 *
 * GET /api/v1/admin/insurance/report
 *
 * 权限：insurance:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInsuranceManagementReport } from '../aggregators/insuranceManagementAggregator.js';

export const insuranceManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/insurance/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'insurance:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '医保办';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInsuranceManagementReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
