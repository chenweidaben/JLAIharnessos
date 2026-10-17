/**
 * 健澜科技 jlmedaios - 能源管理明细 V13 单测（M385-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMonthlyElectricityUsageV13,
  computeMonthlyGasUsageV13,
  computeMonthlyWaterUsageV13,
  type EnergyMgmtDetailRecordV13,
} from "../../src/bff/aggregators/energyMgmtDetailV13Aggregator";
import { energyMgmtDetailV13Routes } from "../../src/bff/routes/energyMgmtDetailV13";

const records: EnergyMgmtDetailRecordV13[] = [
  { electricityUsage: 10000, waterUsage: 5000, gasUsage: 2000 },
  { electricityUsage: 10000, waterUsage: 5000, gasUsage: 2000 },
];

describe("computeMonthlyElectricityUsageV13", () => {
  // 算式：10000+10000 = 20000
  it("月度用电量 = 20000 kWh", () => {
    expect(computeMonthlyElectricityUsageV13(records)).toBe(20000);
  });
  it("空态 → 0", () => {
    expect(computeMonthlyElectricityUsageV13([])).toBe(0);
  });
});

describe("computeMonthlyWaterUsageV13", () => {
  // 算式：5000+5000 = 10000
  it("月度用水量 = 10000 吨", () => {
    expect(computeMonthlyWaterUsageV13(records)).toBe(10000);
  });
});

describe("computeMonthlyGasUsageV13", () => {
  // 算式：2000+2000 = 4000
  it("月度用气量 = 4000 立方米", () => {
    expect(computeMonthlyGasUsageV13(records)).toBe(4000);
  });
});

describe("energyMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/energy-mgmt-detail 路由存在且 auth:true", () => {
    const route = energyMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/energy-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
