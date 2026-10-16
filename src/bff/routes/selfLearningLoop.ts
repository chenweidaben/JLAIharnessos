/**
 * 健澜科技 jlmedaios - 全自学习闭环深化路由（M186-D）
 *
 * GET /api/v1/learning/self-loop
 *
 * 权限：learning:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSelfLearningLoop } from '../aggregators/selfLearningLoopAggregator.js';

export const selfLearningLoopRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/learning/self-loop',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'learning:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSelfLearningLoop(timeRange);
      return json(ok(result));
    },
  },
];
