/**
 * 健澜科技 jlmedaios - 能耗管理 V13 单测（M352-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMonthlyElectricityUsageV13,
  computeMonthlyWaterUsageV13,
  computePerTenThousandRevenueEnergyV13,
  type EnergyConsumptionRecordV13,
} from "../../src/bff/aggregators/energyConsumptionV13Aggregator";
import { energyConsumptionV13Routes } from "../../src/bff/routes/energyConsumptionV13";

const records: EnergyConsumptionRecordV13[] = [
  { monthlyWaterUsage: 5000, monthlyElectricityUsage: 100000, comprehensiveEnergyCoal: 25, businessRevenueYuan: 1000000 },
  { monthlyWaterUsage: 5000, monthlyElectricityUsage: 100000, comprehensiveEnergyCoal: 25, businessRevenueYuan: 1000000 },
];

describe("computeMonthlyWaterUsageV13", () => {
  // 算式：5000+5000 = 10000
  it("月度用水量 = 10000 吨", () => {
    expect(computeMonthlyWaterUsageV13(records)).toBe(10000);
  });
  it("空态 → 0", () => {
    expect(computeMonthlyWaterUsageV13([])).toBe(0);
  });
});

describe("computeMonthlyElectricityUsageV13", () => {
  // 算式：100000+100000 = 200000
  it("月度用电量 = 200000 kWh", () => {
    expect(computeMonthlyElectricityUsageV13(records)).toBe(200000);
  });
});

describe("computePerTenThousandRevenueEnergyV13", () => {
  // 算式：(25+25)/(1000000+1000000)×10000 = 50/2000000×10000 = 0.25
  it("万元产值能耗 = 0.25 吨标煤/万元", () => {
    expect(computePerTenThousandRevenueEnergyV13(records)).toBe(0.25);
  });
});

describe("energyConsumptionV13Routes 读路由", () => {
  it("GET /api/v1/energy-consumption 路由存在且 auth:true", () => {
    const route = energyConsumptionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/energy-consumption",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
