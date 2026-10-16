/**
 * 健澜科技 jlmedaios - 风险管理路由（M198-D）
 *
 * GET /api/v1/admin/risk-management/report
 *
 * 权限：risk_management:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildRiskManagementReport } from '../aggregators/riskManagementAggregator.js';

export const riskManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/risk-management/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'risk_management:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildRiskManagementReport(timeRange);
      return json(ok(result));
    },
  },
];
