/**
 * 健澜科技 jlmedaios - 移植透析路由（M203-C）
 *
 * GET /api/v1/specialty/transplant/report
 *
 * 权限：transplant:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTransplantReport } from '../aggregators/transplantAggregator.js';

export const transplantRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/transplant/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'transplant:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTransplantReport(timeRange);
      return json(ok(result));
    },
  },
];
