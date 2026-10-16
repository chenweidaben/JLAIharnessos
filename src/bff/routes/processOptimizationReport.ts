/**
 * 健澜科技 jlmedaios - 流程优化路由（M218-C）
 *
 * GET /api/v1/process-optimization/report
 *
 * 权限：process_optimization:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildProcessOptimizationReport } from '../aggregators/processOptimizationReportAggregator.js';

export const processOptimizationReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/process-optimization/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'process_optimization:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildProcessOptimizationReport(timeRange);
      return json(ok(result));
    },
  },
];
