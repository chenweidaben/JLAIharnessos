/**
 * 健澜科技 jlmedaios - 数据资产 V3 路由（M206-D）
 *
 * GET /api/v1/data-asset/report-v3
 *
 * 权限：data_asset:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDataAssetReportV3 } from '../aggregators/dataAssetReportV3Aggregator.js';

export const dataAssetReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/data-asset/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_asset:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDataAssetReportV3(timeRange);
      return json(ok(result));
    },
  },
];
