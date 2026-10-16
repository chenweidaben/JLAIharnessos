/**
 * 健澜科技 jlmedaios - 互联网医院深化路由 V2（M195-A）
 *
 * GET /api/v1/internet-hospital/report
 *
 * 权限：internet_hospital:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildInternetHospitalReportV2 } from '../aggregators/internetHospitalV2Aggregator.js';

export const internetHospitalV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/internet-hospital/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'internet_hospital:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildInternetHospitalReportV2(timeRange);
      return json(ok(result));
    },
  },
];
