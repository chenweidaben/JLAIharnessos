/**
 * 健澜科技 jlmedaios - 高质量发展 V2 路由（M230-A）
 *
 * GET /api/v1/high-quality-development/report-v2
 *
 * 权限：high-quality-development:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildHighQualityDevelopmentReportV2 } from '../aggregators/highQualityDevelopmentReportV2Aggregator.js';

export const highQualityDevelopmentReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/high-quality-development/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'high-quality-development:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildHighQualityDevelopmentReportV2(timeRange);
      return json(ok(result));
    },
  },
];
