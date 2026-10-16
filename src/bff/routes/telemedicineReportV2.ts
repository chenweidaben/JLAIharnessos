/**
 * 健澜科技 jlmedaios - 远程医疗 V2 路由（M214-B）
 *
 * GET /api/v1/telemedicine/report-v2
 *
 * 权限：telemedicine:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildTelemedicineReportV2 } from '../aggregators/telemedicineReportV2Aggregator.js';

export const telemedicineReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/telemedicine/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'telemedicine:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildTelemedicineReportV2(timeRange);
      return json(ok(result));
    },
  },
];
