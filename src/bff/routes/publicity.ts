/**
 * 健澜科技 jlmedaios - 宣传管理路由（M194-D）
 *
 * GET /api/v1/admin/publicity/report
 *
 * 权限：publicity:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPublicityReport } from '../aggregators/publicityAggregator.js';

export const publicityRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/publicity/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'publicity:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '宣传科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPublicityReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
