/**
 * 健澜科技 jlmedaios - 病理服务 V13 路由（M374-C）
 *
 * GET /api/v1/pathology-service
 *
 * 权限：pathology-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePathologyBiopsyCountV13,
  computePathologyDiagnosisConsistencyRateV13,
  computePathologyFrozenSectionCountV13,
  type PathologyServiceRecordV13,
} from "../aggregators/pathologyServiceV13Aggregator.js";

const records: PathologyServiceRecordV13[] = [
  { biopsyCount: 100, frozenSectionCount: 50, diagnosisSample: 100, diagnosisPass: 98 },
  { biopsyCount: 100, frozenSectionCount: 50, diagnosisSample: 100, diagnosisPass: 98 },
];

export const pathologyServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pathology-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pathology-service:read");
      if (denied) return denied;
      return json(ok({
        pathologyBiopsyCount: computePathologyBiopsyCountV13(records),
        pathologyFrozenSectionCount: computePathologyFrozenSectionCountV13(records),
        pathologyDiagnosisConsistencyRate: computePathologyDiagnosisConsistencyRateV13(records),
      }));
    },
  },
];
