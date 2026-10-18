/**
 * 健澜科技 jlmedaios - 安全生产管理 V13 路由（M447-C，应急管理与安全生产管理组）
 *
 * GET /api/v1/safety-production-mgmt
 *
 * 权限：safety-production-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSafetyProductionAccidentCountV13,
  computeSafetyProductionHazardRectificationRateV13,
  computeSafetyProductionTrainingCoverageRateV13,
  type SafetyProductionMgmtRecordV13,
} from "../aggregators/safetyProductionMgmtV13Aggregator.js";

const records: SafetyProductionMgmtRecordV13[] = [
  { rectified: 950, totalHazard: 1000, trained: 900, shouldTrain: 1000, accident: true },
  { rectified: 950, totalHazard: 1000, trained: 900, shouldTrain: 1000, accident: true },
];

export const safetyProductionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/safety-production-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "safety-production-mgmt:read");
      if (denied) return denied;
      return json(ok({
        safetyProductionHazardRectificationRate: computeSafetyProductionHazardRectificationRateV13(records),
        safetyProductionTrainingCoverageRate: computeSafetyProductionTrainingCoverageRateV13(records),
        safetyProductionAccidentCount: computeSafetyProductionAccidentCountV13(records),
      }));
    },
  },
];
