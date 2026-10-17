/**
 * 健澜科技 jlmedaios - 隔离管理（细节）V13 路由（M423-B，detail 避让旧版 isolationMgmtV13（M393-B））
 *
 * GET /api/v1/isolation-detail
 *
 * 权限：isolation-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIsolationMeasuresImplementationRateV13,
  computeIsolationOrderComplianceRateV13,
  computeIsolationSignCorrectRateV13,
  type IsolationDetailRecordV13,
} from "../aggregators/isolationDetailV13Aggregator.js";

const records: IsolationDetailRecordV13[] = [
  { implemented: 980, shouldIsolate: 1000, signCorrect: 990, isolationTotal: 1000, orderCompliant: 970, isolationOrderTotal: 1000 },
  { implemented: 980, shouldIsolate: 1000, signCorrect: 990, isolationTotal: 1000, orderCompliant: 970, isolationOrderTotal: 1000 },
];

export const isolationDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/isolation-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "isolation-detail:read");
      if (denied) return denied;
      return json(ok({
        isolationMeasuresImplementationRate: computeIsolationMeasuresImplementationRateV13(records),
        isolationSignCorrectRate: computeIsolationSignCorrectRateV13(records),
        isolationOrderComplianceRate: computeIsolationOrderComplianceRateV13(records),
      }));
    },
  },
];
