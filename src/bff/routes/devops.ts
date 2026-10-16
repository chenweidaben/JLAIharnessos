/**
 * 健澜科技 jlmedaios - DevOps 路由（M197-C）
 *
 * GET /api/v1/admin/devops/report
 *
 * 权限：devops:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDevOpsReport } from '../aggregators/devopsAggregator.js';

export const devopsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/devops/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'devops:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDevOpsReport(timeRange);
      return json(ok(result));
    },
  },
];
