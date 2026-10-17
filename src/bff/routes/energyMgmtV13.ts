/**
 * 健澜科技 jlmedaios - 能源管理 V13 路由（M377-C）
 *
 * GET /api/v1/energy-mgmt
 *
 * 权限：energy-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEnergyYoYDeclineRateV13,
  computeMonthlyElectricityUsageV13,
  computeMonthlyWaterUsageV13,
  type EnergyMgmtRecordV13,
} from "../aggregators/energyMgmtV13Aggregator.js";

const records: EnergyMgmtRecordV13[] = [
  { electricityUsage: 10000, waterUsage: 5000, lastYearElectricity: 10000, currentYearElectricity: 9500 },
  { electricityUsage: 10000, waterUsage: 5000, lastYearElectricity: 10000, currentYearElectricity: 9500 },
];

export const energyMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/energy-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "energy-mgmt:read");
      if (denied) return denied;
      return json(ok({
        monthlyElectricityUsage: computeMonthlyElectricityUsageV13(records),
        monthlyWaterUsage: computeMonthlyWaterUsageV13(records),
        energyYoYDeclineRate: computeEnergyYoYDeclineRateV13(records),
      }));
    },
  },
];
