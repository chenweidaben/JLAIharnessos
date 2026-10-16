/**
 * 健澜科技 jlmedaios - 智能预警 V2 路由（M208-B）
 *
 * GET /api/v1/smart-alert/report-v2
 *
 * 权限：smart_alert:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildSmartAlertReportV2 } from '../aggregators/smartAlertReportV2Aggregator.js';

export const smartAlertReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/smart-alert/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'smart_alert:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildSmartAlertReportV2(timeRange);
      return json(ok(result));
    },
  },
];
