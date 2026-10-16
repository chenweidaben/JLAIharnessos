/**
 * 健澜科技 jlmedaios - 信息化规划 V2 路由（M227-A）
 *
 * GET /api/v1/informatization/report-v2
 *
 * 权限：informatization:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInformatizationPlanReportV2 } from '../aggregators/informatizationPlanReportV2Aggregator.js';

export const informatizationPlanReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/informatization/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'informatization:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInformatizationPlanReportV2(timeRange);
      return json(ok(result));
    },
  },
];
