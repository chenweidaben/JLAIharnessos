/**
 * 健澜科技 jlmedaios - 精神心理路由（M202-B）
 *
 * GET /api/v1/specialty/psychiatry/report
 *
 * 权限：psychiatry:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPsychiatryReport } from '../aggregators/psychiatryAggregator.js';

export const psychiatryRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/psychiatry/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'psychiatry:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '精神心理科';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPsychiatryReport(dept, timeRange);
      return json(ok(result));
    },
  },
];
