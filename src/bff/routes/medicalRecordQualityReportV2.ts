/**
 * 健澜科技 jlmedaios - 病历质量 V2 路由（M209-C）
 *
 * GET /api/v1/mr-quality/report-v2
 *
 * 权限：mr_quality:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMedicalRecordQualityReportV2 } from '../aggregators/medicalRecordQualityReportV2Aggregator.js';

export const medicalRecordQualityReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/mr-quality/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'mr_quality:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMedicalRecordQualityReportV2(timeRange);
      return json(ok(result));
    },
  },
];
