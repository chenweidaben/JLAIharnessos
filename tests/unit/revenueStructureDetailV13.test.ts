/**
 * 健澜科技 jlmedaios - 收入结构明细 V13 单测（M396-B，避让旧版 revenueStructureV13/revenueStructureStatsV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeMedicalRevenueRatioV13,
  type RevenueStructureDetailRecordV13,
} from "../../src/bff/aggregators/revenueStructureDetailV13Aggregator";
import { revenueStructureDetailV13Routes } from "../../src/bff/routes/revenueStructureDetailV13";

const records: RevenueStructureDetailRecordV13[] = [
  { medicalRevenue: 600, totalRevenue: 1000, drugRevenue: 200, consumableRevenue: 100 },
  { medicalRevenue: 600, totalRevenue: 1000, drugRevenue: 200, consumableRevenue: 100 },
];

describe("computeMedicalRevenueRatioV13", () => {
  // 算式：(600+600)/(1000+1000) = 1200/2000×100 = 60.00
  it("医疗收入占比 = 60.00%", () => {
    expect(computeMedicalRevenueRatioV13(records)).toBe(60.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalRevenueRatioV13([])).toBe(0);
  });
});

describe("computeDrugRatioV13", () => {
  // 算式：(200+200)/(600+600) = 400/1200×100 = 33.33
  it("药占比 = 33.33%", () => {
    expect(computeDrugRatioV13(records)).toBe(33.33);
  });
});

describe("computeConsumableRatioV13", () => {
  // 算式：(100+100)/(600+600) = 200/1200×100 = 16.67
  it("耗占比 = 16.67%", () => {
    expect(computeConsumableRatioV13(records)).toBe(16.67);
  });
});

describe("revenueStructureDetailV13Routes 读路由", () => {
  it("GET /api/v1/revenue-structure-detail 路由存在且 auth:true", () => {
    const route = revenueStructureDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/revenue-structure-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
