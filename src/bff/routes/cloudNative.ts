/**
 * 健澜科技 jlmedaios - 云原生路由（M197-A）
 *
 * GET /api/v1/admin/cloud-native/report
 *
 * 权限：cloud_native:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildCloudNativeReport } from '../aggregators/cloudNativeAggregator.js';

export const cloudNativeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/cloud-native/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'cloud_native:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildCloudNativeReport(timeRange);
      return json(ok(result));
    },
  },
];
