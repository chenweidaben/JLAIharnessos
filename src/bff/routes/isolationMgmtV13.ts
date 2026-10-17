/**
 * 健澜科技 jlmedaios - 隔离管理 V13 路由（M393-B）
 *
 * GET /api/v1/isolation-mgmt
 *
 * 权限：isolation-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIsolationLabelCorrectRateV13,
  computeIsolationMeasureImplementationRateV13,
  computeIsolationPatientDisposalRateV13,
  type IsolationMgmtRecordV13,
} from "../aggregators/isolationMgmtV13Aggregator.js";

const records: IsolationMgmtRecordV13[] = [
  { implementedCount: 950, shouldCount: 1000, correctCount: 980, checkTotalCount: 1000, disposedCount: 900, shouldDisposeCount: 1000 },
  { implementedCount: 950, shouldCount: 1000, correctCount: 980, checkTotalCount: 1000, disposedCount: 900, shouldDisposeCount: 1000 },
];

export const isolationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/isolation-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "isolation-mgmt:read");
      if (denied) return denied;
      return json(ok({
        isolationMeasureImplementationRate: computeIsolationMeasureImplementationRateV13(records),
        isolationLabelCorrectRate: computeIsolationLabelCorrectRateV13(records),
        isolationPatientDisposalRate: computeIsolationPatientDisposalRateV13(records),
      }));
    },
  },
];
