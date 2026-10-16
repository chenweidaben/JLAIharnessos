/**
 * 健澜科技 jlmedaios - 学科评估 V3 路由（M230-D）
 *
 * GET /api/v1/discipline-assessment/report-v3
 *
 * 权限：discipline-assessment:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildDisciplineAssessmentReportV3 } from '../aggregators/disciplineAssessmentReportV3Aggregator.js';

export const disciplineAssessmentReportV3Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/discipline-assessment/report-v3',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'discipline-assessment:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildDisciplineAssessmentReportV3(timeRange);
      return json(ok(result));
    },
  },
];
