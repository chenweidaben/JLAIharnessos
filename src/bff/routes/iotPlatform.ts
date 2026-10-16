/**
 * 健澜科技 jlmedaios - 物联网平台路由（M196-C）
 *
 * GET /api/v1/admin/iot-platform/report
 *
 * 权限：iot_platform:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildIoTPlatformReport } from '../aggregators/iotPlatformAggregator.js';

export const iotPlatformRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/iot-platform/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'iot_platform:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildIoTPlatformReport(timeRange);
      return json(ok(result));
    },
  },
];
