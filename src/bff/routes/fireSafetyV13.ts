/**
 * 健澜科技 jlmedaios - 消防安全 V13 路由（M352-A）
 *
 * GET /api/v1/fire-safety
 *
 * 权限：fire-safety:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrillCountV13,
  computeHazardRectificationRateV13,
  computeMonthlyInspectionCountV13,
  type FireSafetyRecordV13,
} from "../aggregators/fireSafetyV13Aggregator.js";

const records: FireSafetyRecordV13[] = [
  { monthlyInspectionCount: 10, hazardFoundCount: 10, hazardRectifiedCount: 9, drillCount: 2 },
  { monthlyInspectionCount: 10, hazardFoundCount: 10, hazardRectifiedCount: 9, drillCount: 2 },
];

export const fireSafetyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fire-safety",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fire-safety:read");
      if (denied) return denied;
      return json(ok({
        monthlyInspectionCount: computeMonthlyInspectionCountV13(records),
        hazardRectificationRate: computeHazardRectificationRateV13(records),
        drillCount: computeDrillCountV13(records),
      }));
    },
  },
];
