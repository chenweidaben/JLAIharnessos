/**
 * 健澜科技 jlmedaios - AI 影像病理路由（M203-D）
 *
 * GET /api/v1/specialty/ai-diagnosis/report
 *
 * 权限：ai_diagnosis:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildAIDiagnosisReport } from '../aggregators/aiDiagnosisAggregator.js';

export const aiDiagnosisRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/specialty/ai-diagnosis/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'ai_diagnosis:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildAIDiagnosisReport(timeRange);
      return json(ok(result));
    },
  },
];
