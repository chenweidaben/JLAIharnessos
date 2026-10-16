/**
 * 健澜科技 jlmedaios - 营养膳食路由（M220-C）
 *
 * GET /api/v1/nutrition/report
 *
 * 权限：nutrition:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildNutritionReport } from '../aggregators/nutritionReportAggregator.js';

export const nutritionReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nutrition/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'nutrition:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildNutritionReport(timeRange);
      return json(ok(result));
    },
  },
];
