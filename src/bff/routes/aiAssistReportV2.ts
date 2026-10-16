/**
 * 健澜科技 jlmedaios - AI 辅助 V2 路由（M208-A）
 *
 * GET /api/v1/ai-assist/report-v2
 *
 * 权限：ai_assist:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAIAssistReportV2 } from '../aggregators/aiAssistReportV2Aggregator.js';

export const aiAssistReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-assist/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'ai_assist:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAIAssistReportV2(timeRange);
      return json(ok(result));
    },
  },
];
