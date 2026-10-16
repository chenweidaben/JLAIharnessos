/**
 * 健澜科技 jlmedaios - 多 Agent 路由（M201-B）
 *
 * GET /api/v1/admin/multi-agent/report
 *
 * 权限：multi_agent:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMultiAgentReport } from '../aggregators/multiAgentAggregator.js';

export const multiAgentRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/multi-agent/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'multi_agent:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMultiAgentReport(timeRange);
      return json(ok(result));
    },
  },
];
