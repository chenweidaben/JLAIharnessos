/**
 * 健澜科技 jlmedaios - AI 中台路由（M196-B）
 *
 * GET /api/v1/admin/ai-platform/report
 *
 * 权限：ai_platform:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAIPlatformReport } from '../aggregators/aiPlatformAggregator.js';

export const aiPlatformRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/ai-platform/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'ai_platform:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAIPlatformReport(timeRange);
      return json(ok(result));
    },
  },
];
