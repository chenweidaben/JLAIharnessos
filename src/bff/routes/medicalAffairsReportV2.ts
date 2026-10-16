/**
 * 健澜科技 jlmedaios - 医务 V2 路由（M212-B）
 *
 * GET /api/v1/medical-affairs/report-v2
 *
 * 权限：medical_affairs:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMedicalAffairsReportV2 } from '../aggregators/medicalAffairsReportV2Aggregator.js';

export const medicalAffairsReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medical-affairs/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medical_affairs:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMedicalAffairsReportV2(timeRange);
      return json(ok(result));
    },
  },
];
