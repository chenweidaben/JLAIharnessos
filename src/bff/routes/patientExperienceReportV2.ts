/**
 * 健澜科技 jlmedaios - 患者体验 V2 路由（M218-A）
 *
 * GET /api/v1/patient-experience/report-v2
 *
 * 权限：patient_experience:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildPatientExperienceReportV2 } from '../aggregators/patientExperienceReportV2Aggregator.js';

export const patientExperienceReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient-experience/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_experience:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildPatientExperienceReportV2(timeRange);
      return json(ok(result));
    },
  },
];
