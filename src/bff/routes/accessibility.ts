/**
 * 健澜科技 jlmedaios - 无障碍路由（M199-B）
 *
 * GET /api/v1/admin/accessibility/report
 *
 * 权限：accessibility:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAccessibilityReport } from '../aggregators/accessibilityAggregator.js';

export const accessibilityRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/accessibility/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'accessibility:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAccessibilityReport(timeRange);
      return json(ok(result));
    },
  },
];
