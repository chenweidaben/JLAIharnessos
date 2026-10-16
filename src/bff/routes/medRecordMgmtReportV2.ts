/**
 * 健澜科技 jlmedaios - 病案管理 V2 路由（M225-D）
 *
 * GET /api/v1/medical-record/report-v2
 *
 * 权限：medical-record:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth.js';
import { type Ctx, json, ok, type RouteDef } from '../types.js';
import { buildMedRecordMgmtReportV2 } from '../aggregators/medRecordMgmtReportV2Aggregator.js';

export const medRecordMgmtReportV2Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medical-record/report-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medical-record:report:view');
      if (denied) return denied;

      const timeRange = c.query.get('timeRange') ?? '30d';
      const result = buildMedRecordMgmtReportV2(timeRange);
      return json(ok(result));
    },
  },
];
