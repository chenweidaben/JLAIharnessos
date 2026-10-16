/**
 * 健澜科技 jlmedaios - 互联网医院 V2 路由（M214-A）
 *
 * GET /api/v1/internet-hospital/report-v2
 *
 * 权限：internet_hospital:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInternetHospitalReportV2 } from '../aggregators/internetHospitalReportV2Aggregator.js';

export const internetHospitalReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/internet-hospital/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'internet_hospital:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInternetHospitalReportV2(timeRange);
      return json(ok(result));
    },
  },
];
