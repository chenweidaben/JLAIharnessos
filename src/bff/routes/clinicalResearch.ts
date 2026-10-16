/**
 * 健澜科技 jlmedaios - 临床试验科研路由（M202-D）
 *
 * GET /api/v1/admin/research/report
 *
 * 权限：research:report:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildClinicalResearchReport } from '../aggregators/clinicalResearchAggregator.js';

export const clinicalResearchRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/research/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildClinicalResearchReport(timeRange);
      return json(ok(result));
    },
  },
];
