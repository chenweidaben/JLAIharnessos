/**
 * 健澜科技 jlmedaios - 床位利用 V13 路由（M396-A）
 *
 * GET /api/v1/bed-utilization
 *
 * 权限：bed-utilization:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAverageLengthOfStayV13,
  computeBedTurnoverRateV13,
  computeBedUtilizationRateV13,
  type BedUtilizationRecordV13,
} from "../aggregators/bedUtilizationV13Aggregator.js";

const records: BedUtilizationRecordV13[] = [
  { occupiedBedDays: 900, openBedDays: 1000, dischargeCount: 100, avgOpenBeds: 50, patientBedDays: 900 },
  { occupiedBedDays: 900, openBedDays: 1000, dischargeCount: 100, avgOpenBeds: 50, patientBedDays: 900 },
];

export const bedUtilizationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/bed-utilization",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "bed-utilization:read");
      if (denied) return denied;
      return json(ok({
        bedUtilizationRate: computeBedUtilizationRateV13(records),
        bedTurnoverRate: computeBedTurnoverRateV13(records),
        averageLengthOfStay: computeAverageLengthOfStayV13(records),
      }));
    },
  },
];
