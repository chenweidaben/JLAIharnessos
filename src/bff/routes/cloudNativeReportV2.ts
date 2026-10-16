/**
 * 健澜科技 jlmedaios - 云原生 V2 路由（M216-A）
 *
 * GET /api/v1/cloud-native/report-v2
 *
 * 权限：cloud_native:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildCloudNativeReportV2 } from '../aggregators/cloudNativeReportV2Aggregator.js';

export const cloudNativeReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/cloud-native/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'cloud_native:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildCloudNativeReportV2(timeRange);
      return json(ok(result));
    },
  },
];
