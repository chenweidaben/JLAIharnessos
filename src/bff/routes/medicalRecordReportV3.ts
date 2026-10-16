/**
 * 健澜科技 jlmedaios - 病案 V3 路由（M205-B）
 *
 * GET /api/v1/medical-record/report-v3
 *
 * 权限：medical_record:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMedicalRecordReportV3 } from '../aggregators/medicalRecordReportV3Aggregator.js';

export const medicalRecordReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medical-record/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medical_record:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMedicalRecordReportV3(timeRange);
      return json(ok(result));
    },
  },
];
