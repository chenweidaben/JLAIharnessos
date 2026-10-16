/**
 * 健澜科技 jlmedaios - 微服务 V2 路由（M216-B）
 *
 * GET /api/v1/microservice/report-v2
 *
 * 权限：microservice:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMicroserviceReportV2 } from '../aggregators/microserviceReportV2Aggregator.js';

export const microserviceReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/microservice/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'microservice:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMicroserviceReportV2(timeRange);
      return json(ok(result));
    },
  },
];
