/**
 * 健澜科技 jlmedaios - 人才队伍 V2 路由（M219-B）
 *
 * GET /api/v1/talent/report-v2
 *
 * 权限：talent:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTalentReportV2 } from '../aggregators/talentReportV2Aggregator.js';

export const talentReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/talent/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'talent:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTalentReportV2(timeRange);
      return json(ok(result));
    },
  },
];
