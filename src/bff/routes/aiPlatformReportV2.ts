/**
 * 健澜科技 jlmedaios - AI 中台 V2 路由（M215-B）
 *
 * GET /api/v1/ai-platform/report-v2
 *
 * 权限：ai_platform:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAIPlatformReportV2 } from '../aggregators/aiPlatformReportV2Aggregator.js';

export const aiPlatformReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-platform/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'ai_platform:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAIPlatformReportV2(timeRange);
      return json(ok(result));
    },
  },
];
