/**
 * 健澜科技 jlmedaios - 纪检监察路由（M194-B）
 *
 * GET /api/v1/admin/discipline/report
 *
 * 权限：discipline:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDisciplineInspectionReport } from '../aggregators/disciplineInspectionAggregator.js';

export const disciplineInspectionRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/discipline/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'discipline:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '纪委办公室';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDisciplineInspectionReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
