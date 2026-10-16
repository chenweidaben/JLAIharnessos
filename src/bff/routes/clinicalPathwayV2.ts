/**
 * 健澜科技 jlmedaios - 临床路径管理 V2 路由（M188-A）
 *
 * GET /api/v1/clinical/pathway/report-v2
 *
 * 权限：clinical_pathway:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildClinicalPathway } from '../aggregators/clinicalPathwayV2Aggregator.js';

export const clinicalPathwayV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/clinical/pathway/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'clinical_pathway:view');
      if (denied) return denied;

      const dept = c.query.get('dept') ?? '心内科';
      const disease = c.query.get('disease') ?? '冠心病';
      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildClinicalPathway(dept, disease, timeRange);
      return json(ok(result));
    },
  },
];
