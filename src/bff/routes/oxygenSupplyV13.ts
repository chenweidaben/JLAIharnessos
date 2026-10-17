/**
 * 健澜科技 jlmedaios - 氧气供应 V13 路由（M351-C）
 *
 * GET /api/v1/oxygen-supply
 *
 * 权限：oxygen-supply:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeLiquidOxygenConsumptionV13,
  computeOxygenSupplyPassRateV13,
  computeSuctionAnomalyCountV13,
  type OxygenSupplyRecordV13,
} from "../aggregators/oxygenSupplyV13Aggregator.js";

const records: OxygenSupplyRecordV13[] = [
  { liquidOxygenConsumption: 5000, suctionAnomalyCount: 3, oxygenTestCount: 100, oxygenPassedCount: 99 },
  { liquidOxygenConsumption: 5000, suctionAnomalyCount: 2, oxygenTestCount: 100, oxygenPassedCount: 98 },
];

export const oxygenSupplyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/oxygen-supply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "oxygen-supply:read");
      if (denied) return denied;
      return json(ok({
        liquidOxygenConsumption: computeLiquidOxygenConsumptionV13(records),
        suctionAnomalyCount: computeSuctionAnomalyCountV13(records),
        oxygenSupplyPassRate: computeOxygenSupplyPassRateV13(records),
      }));
    },
  },
];
