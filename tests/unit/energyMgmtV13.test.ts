/**
 * 健澜科技 jlmedaios - 能源管理 V13 单测（M377-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEnergyYoYDeclineRateV13,
  computeMonthlyElectricityUsageV13,
  computeMonthlyWaterUsageV13,
  type EnergyMgmtRecordV13,
} from "../../src/bff/aggregators/energyMgmtV13Aggregator";
import { energyMgmtV13Routes } from "../../src/bff/routes/energyMgmtV13";

const records: EnergyMgmtRecordV13[] = [
  { electricityUsage: 10000, waterUsage: 5000, lastYearElectricity: 10000, currentYearElectricity: 9500 },
  { electricityUsage: 10000, waterUsage: 5000, lastYearElectricity: 10000, currentYearElectricity: 9500 },
];

describe("computeMonthlyElectricityUsageV13", () => {
  // 算式：10000+10000 = 20000
  it("月用电量 = 20000 kWh", () => {
    expect(computeMonthlyElectricityUsageV13(records)).toBe(20000);
  });
  it("空态 → 0", () => {
    expect(computeMonthlyElectricityUsageV13([])).toBe(0);
  });
});

describe("computeMonthlyWaterUsageV13", () => {
  // 算式：5000+5000 = 10000
  it("月用水量 = 10000 吨", () => {
    expect(computeMonthlyWaterUsageV13(records)).toBe(10000);
  });
});

describe("computeEnergyYoYDeclineRateV13", () => {
  // 算式：(20000-19000)/20000×100 = 1000/20000×100 = 5.00
  it("能耗同比下降率 = 5.00%", () => {
    expect(computeEnergyYoYDeclineRateV13(records)).toBe(5.00);
  });
});

describe("energyMgmtV13Routes 读路由", () => {
  it("GET /api/v1/energy-mgmt 路由存在且 auth:true", () => {
    const route = energyMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/energy-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
