/**
 * 健澜科技 jlmedaios - 能耗质量管理 V13 路由（M435-D，M435 收官，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
 *
 * GET /api/v1/energy-quality-mgmt
 *
 * 权限：energy-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEnergyCostControlRateV13,
  computeEnergyReductionRateV13,
  computeWaterElectricityGasSavingRateV13,
  type EnergyQualityMgmtRecordV13,
} from "../aggregators/energyQualityMgmtV13Aggregator.js";

const records: EnergyQualityMgmtRecordV13[] = [
  { previousEnergy: 1000, currentEnergy: 900, savingUsage: 100, previousUsage: 1000, currentCost: 900, budgetCost: 1000 },
  { previousEnergy: 1000, currentEnergy: 900, savingUsage: 100, previousUsage: 1000, currentCost: 900, budgetCost: 1000 },
];

export const energyQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/energy-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "energy-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        energyReductionRate: computeEnergyReductionRateV13(records),
        waterElectricityGasSavingRate: computeWaterElectricityGasSavingRateV13(records),
        energyCostControlRate: computeEnergyCostControlRateV13(records),
      }));
    },
  },
];
