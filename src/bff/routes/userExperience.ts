/**
 * 健澜科技 jlmedaios - 用户体验路由（M199-A）
 *
 * GET /api/v1/admin/user-experience/report
 *
 * 权限：user_experience:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildUserExperienceReport } from '../aggregators/userExperienceAggregator.js';

export const userExperienceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/user-experience/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'user_experience:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildUserExperienceReport(timeRange);
      return json(ok(result));
    },
  },
];
