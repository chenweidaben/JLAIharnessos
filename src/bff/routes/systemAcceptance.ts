/**
 * 健澜科技 jlmedaios - 系统验收路由（M200-A）
 *
 * GET /api/v1/admin/acceptance/report
 *
 * 权限：acceptance:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSystemAcceptanceReport } from '../aggregators/systemAcceptanceAggregator.js';

export const systemAcceptanceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/acceptance/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'acceptance:view');
      if (denied) return denied;

      const result = buildSystemAcceptanceReport();
      return json(ok(result));
    },
  },
];
