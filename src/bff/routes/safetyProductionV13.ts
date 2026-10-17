/**
 * 健澜科技 jlmedaios - 安全生产 V13 路由（M385-D，M385 收官）
 *
 * GET /api/v1/safety-production
 *
 * 权限：safety-production:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAccidentCountV13,
  computeHazardRectificationRateV13,
  computeSafetyInspectionCountV13,
  type SafetyProductionRecordV13,
} from "../aggregators/safetyProductionV13Aggregator.js";

const records: SafetyProductionRecordV13[] = [
  { inspectionCount: 20, rectifiedCount: 190, totalHazardCount: 200, accidentCount: 2 },
  { inspectionCount: 20, rectifiedCount: 190, totalHazardCount: 200, accidentCount: 2 },
];

export const safetyProductionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/safety-production",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "safety-production:read");
      if (denied) return denied;
      return json(ok({
        safetyInspectionCount: computeSafetyInspectionCountV13(records),
        hazardRectificationRate: computeHazardRectificationRateV13(records),
        accidentCount: computeAccidentCountV13(records),
      }));
    },
  },
];
