/**
 * 健澜科技 jlmedaios - 能耗质量管理 V13 单测（M435-D，M435 收官，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEnergyCostControlRateV13,
  computeEnergyReductionRateV13,
  computeWaterElectricityGasSavingRateV13,
  type EnergyQualityMgmtRecordV13,
} from "../../src/bff/aggregators/energyQualityMgmtV13Aggregator";
import { energyQualityMgmtV13Routes } from "../../src/bff/routes/energyQualityMgmtV13";

const records: EnergyQualityMgmtRecordV13[] = [
  { previousEnergy: 1000, currentEnergy: 900, savingUsage: 100, previousUsage: 1000, currentCost: 900, budgetCost: 1000 },
  { previousEnergy: 1000, currentEnergy: 900, savingUsage: 100, previousUsage: 1000, currentCost: 900, budgetCost: 1000 },
];

describe("computeEnergyReductionRateV13", () => {
  // 算式：((1000-900)+(1000-900))/(1000+1000)×100 = (100+100)/2000×100 = 200/2000×100 = 10.00（正向，越高越好）
  it("能耗降低率 = 10.00%（正向，越高越好）", () => {
    expect(computeEnergyReductionRateV13(records)).toBe(10.00);
  });
  it("空态 → 0", () => {
    expect(computeEnergyReductionRateV13([])).toBe(0);
  });
});

describe("computeWaterElectricityGasSavingRateV13", () => {
  // 算式：(100+100)/(1000+1000)×100 = 200/2000×100 = 10.00（正向，越高越好）
  it("水电气节约率 = 10.00%（正向，越高越好）", () => {
    expect(computeWaterElectricityGasSavingRateV13(records)).toBe(10.00);
  });
});

describe("computeEnergyCostControlRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00（反向，越低越好）
  it("能耗成本控制率 = 90.00%（反向，越低越好）", () => {
    expect(computeEnergyCostControlRateV13(records)).toBe(90.00);
  });
});

describe("energyQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/energy-quality-mgmt 路由存在且 auth:true", () => {
    const route = energyQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/energy-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
