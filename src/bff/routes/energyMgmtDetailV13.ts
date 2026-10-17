/**
 * 健澜科技 jlmedaios - 能源管理明细 V13 路由（M385-C）
 *
 * GET /api/v1/energy-mgmt-detail
 *
 * 权限：energy-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMonthlyElectricityUsageV13,
  computeMonthlyGasUsageV13,
  computeMonthlyWaterUsageV13,
  type EnergyMgmtDetailRecordV13,
} from "../aggregators/energyMgmtDetailV13Aggregator.js";

const records: EnergyMgmtDetailRecordV13[] = [
  { electricityUsage: 10000, waterUsage: 5000, gasUsage: 2000 },
  { electricityUsage: 10000, waterUsage: 5000, gasUsage: 2000 },
];

export const energyMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/energy-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "energy-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        monthlyElectricityUsage: computeMonthlyElectricityUsageV13(records),
        monthlyWaterUsage: computeMonthlyWaterUsageV13(records),
        monthlyGasUsage: computeMonthlyGasUsageV13(records),
      }));
    },
  },
];
