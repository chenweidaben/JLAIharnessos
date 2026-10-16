/**
 * 健澜科技 jlmedaios - 科研管理路由（M191-A）
 *
 * GET /api/v1/admin/research/report
 *
 * 权限：research:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildResearchManagementReport } from '../aggregators/researchManagementAggregator.js';

export const researchManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/research/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '科研处';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildResearchManagementReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
