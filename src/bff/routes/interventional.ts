/**
 * 健澜科技 jlmedaios - 介入内镜路由（M203-B）
 *
 * GET /api/v1/specialty/interventional/report
 *
 * 权限：interventional:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInterventionalReport } from '../aggregators/interventionalAggregator.js';

export const interventionalRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/interventional/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'interventional:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInterventionalReport(timeRange);
      return json(ok(result));
    },
  },
];
