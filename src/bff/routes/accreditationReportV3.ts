/**
 * 健澜科技 jlmedaios - 等级评审 V3 路由（M230-B）
 *
 * GET /api/v1/accreditation/report-v3
 *
 * 权限：accreditation:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAccreditationReportV3 } from '../aggregators/accreditationReportV3Aggregator.js';

export const accreditationReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/accreditation/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'accreditation:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAccreditationReportV3(timeRange);
      return json(ok(result));
    },
  },
];
