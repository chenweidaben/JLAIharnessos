/**
 * 健澜科技 jlmedaios - ICU 管理（统计视角）V13 路由（M454-D，M454 收官，门急诊与手术麻醉管理组）
 *
 * GET /api/v1/icu-stats-mgmt
 *
 * 避让说明：基础名 icuMgmtV13 已被早期切片占用，本切片改用 -stats 维度后缀避让。
 *
 * 权限：icu-stats-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIcuStatsAverageLengthOfStayV13,
  computeIcuStatsBedUtilizationRateV13,
  computeIcuStatsCriticalRescueSuccessRateV13,
  type IcuStatsMgmtRecordV13,
} from "../aggregators/icuStatsMgmtV13Aggregator.js";

const records: IcuStatsMgmtRecordV13[] = [
  { usedBedDays: 950, authorizedBedDays: 1000, success: 900, totalCritical: 1000, icuLengthOfStay: 5.3 },
  { usedBedDays: 950, authorizedBedDays: 1000, success: 900, totalCritical: 1000, icuLengthOfStay: 6.2 },
];

export const icuStatsMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/icu-stats-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "icu-stats-mgmt:read");
      if (denied) return denied;
      return json(ok({
        icuStatsBedUtilizationRate: computeIcuStatsBedUtilizationRateV13(records),
        icuStatsCriticalRescueSuccessRate: computeIcuStatsCriticalRescueSuccessRateV13(records),
        icuStatsAverageLengthOfStay: computeIcuStatsAverageLengthOfStayV13(records),
      }));
    },
  },
];
