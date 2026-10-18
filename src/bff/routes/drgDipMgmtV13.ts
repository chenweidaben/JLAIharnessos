/**
 * 健澜科技 jlmedaios - DRG/DIP 管理 V13 路由（M445-D，M445 收官，医保物价与费用管理组）
 *
 * GET /api/v1/drg-dip-mgmt
 *
 * 权限：drg-dip-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrgDipCoverageRateV13,
  computeDrgDipEnrollmentRateV13,
  computeDrgDipWeightBreakEvenRateV13,
  type DrgDipMgmtRecordV13,
} from "../aggregators/drgDipMgmtV13Aggregator.js";

const records: DrgDipMgmtRecordV13[] = [
  { enrolled: 950, totalDrg: 1000, coveredDisease: 900, totalDisease: 1000, breakEven: 980, totalGroup: 1000 },
  { enrolled: 950, totalDrg: 1000, coveredDisease: 900, totalDisease: 1000, breakEven: 980, totalGroup: 1000 },
];

export const drgDipMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drg-dip-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drg-dip-mgmt:read");
      if (denied) return denied;
      return json(ok({
        drgDipEnrollmentRate: computeDrgDipEnrollmentRateV13(records),
        drgDipCoverageRate: computeDrgDipCoverageRateV13(records),
        drgDipWeightBreakEvenRate: computeDrgDipWeightBreakEvenRateV13(records),
      }));
    },
  },
];
