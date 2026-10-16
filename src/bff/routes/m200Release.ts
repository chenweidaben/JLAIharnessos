/**
 * 健澜科技 jlmedaios - M200 发布路由（M200-D）
 *
 * GET /api/v1/admin/release/m200
 *
 * 权限：release:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildM200ReleaseReport } from '../aggregators/m200ReleaseAggregator.js';

export const m200ReleaseRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/release/m200',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'release:view');
      if (denied) return denied;

      const result = buildM200ReleaseReport();
      return json(ok(result));
    },
  },
];
