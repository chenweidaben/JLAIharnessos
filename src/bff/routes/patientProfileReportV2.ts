/**
 * 健澜科技 jlmedaios - 患者画像 V2 路由（M208-C）
 *
 * GET /api/v1/patient-profile/report-v2
 *
 * 权限：patient_profile:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPatientProfileReportV2 } from '../aggregators/patientProfileReportV2Aggregator.js';

export const patientProfileReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient-profile/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_profile:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPatientProfileReportV2(timeRange);
      return json(ok(result));
    },
  },
];
