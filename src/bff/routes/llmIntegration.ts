/**
 * 健澜科技 jlmedaios - 大模型集成路由（M201-A）
 *
 * GET /api/v1/admin/llm/report
 *
 * 权限：llm:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildLLMIntegrationReport } from '../aggregators/llmIntegrationAggregator.js';

export const llmIntegrationRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/llm/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'llm:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildLLMIntegrationReport(timeRange);
      return json(ok(result));
    },
  },
];
