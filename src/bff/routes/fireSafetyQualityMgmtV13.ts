/**
 * 健澜科技 jlmedaios - 消防安全质量管理 V13 路由（M431-C，-quality 后缀避让旧版 fireSafetyDetailV13（M408））
 *
 * GET /api/v1/fire-safety-quality-mgmt
 *
 * 权限：fire-safety-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFireDrillCountV13,
  computeFireFacilityCompletenessRateV13,
  computeFireHazardRectificationRateV13,
  type FireSafetyQualityMgmtRecordV13,
} from "../aggregators/fireSafetyQualityMgmtV13Aggregator.js";

const records: FireSafetyQualityMgmtRecordV13[] = [
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 4, rectified: 95, hazardTotal: 100 },
  { facilityIntact: 980, facilityTotal: 1000, drillCount: 4, rectified: 95, hazardTotal: 100 },
];

export const fireSafetyQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fire-safety-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fire-safety-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        fireFacilityCompletenessRate: computeFireFacilityCompletenessRateV13(records),
        fireDrillCount: computeFireDrillCountV13(records),
        fireHazardRectificationRate: computeFireHazardRectificationRateV13(records),
      }));
    },
  },
];
