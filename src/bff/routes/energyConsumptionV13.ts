/**
 * 健澜科技 jlmedaios - 能耗管理 V13 路由（M352-B）
 *
 * GET /api/v1/energy-consumption
 *
 * 权限：energy-consumption:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMonthlyElectricityUsageV13,
  computeMonthlyWaterUsageV13,
  computePerTenThousandRevenueEnergyV13,
  type EnergyConsumptionRecordV13,
} from "../aggregators/energyConsumptionV13Aggregator.js";

const records: EnergyConsumptionRecordV13[] = [
  { monthlyWaterUsage: 5000, monthlyElectricityUsage: 100000, comprehensiveEnergyCoal: 25, businessRevenueYuan: 1000000 },
  { monthlyWaterUsage: 5000, monthlyElectricityUsage: 100000, comprehensiveEnergyCoal: 25, businessRevenueYuan: 1000000 },
];

export const energyConsumptionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/energy-consumption",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "energy-consumption:read");
      if (denied) return denied;
      return json(ok({
        monthlyWaterUsage: computeMonthlyWaterUsageV13(records),
        monthlyElectricityUsage: computeMonthlyElectricityUsageV13(records),
        perTenThousandRevenueEnergy: computePerTenThousandRevenueEnergyV13(records),
      }));
    },
  },
];
