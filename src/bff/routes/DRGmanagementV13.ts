/**
 * 健澜科技 jlmedaios - DRG 管理 V13 路由（M375-C）
 *
 * GET /api/v1/drg-management
 *
 * 权限：drg-management:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrgAverageWeightV13,
  computeDrgEnrollmentRateV13,
  computeDrgProfitLossV13,
  type DRGmanagementRecordV13,
} from "../aggregators/DRGmanagementV13Aggregator.js";

const records: DRGmanagementRecordV13[] = [
  { dischargeCount: 1000, drgEnrolledCount: 900, averageWeight: 1.2, profitLoss: 50000 },
  { dischargeCount: 1000, drgEnrolledCount: 900, averageWeight: 1.2, profitLoss: -30000 },
];

export const DRGmanagementV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drg-management",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-management:read");
      if (denied) return denied;
      return json(ok({
        drgEnrollmentRate: computeDrgEnrollmentRateV13(records),
        drgAverageWeight: computeDrgAverageWeightV13(records),
        drgProfitLoss: computeDrgProfitLossV13(records),
      }));
    },
  },
];
