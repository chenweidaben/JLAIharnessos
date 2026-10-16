/**
 * 健澜科技 jlmedaios - 教学管理路由（M191-B）
 *
 * GET /api/v1/admin/teaching/report
 *
 * 权限：teaching:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTeachingManagementReport } from '../aggregators/teachingManagementAggregator.js';

export const teachingManagementRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/teaching/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'teaching:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '教务处';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTeachingManagementReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
