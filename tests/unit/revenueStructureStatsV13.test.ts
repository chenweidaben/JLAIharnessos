/**
 * 健澜科技 jlmedaios - 业务收入结构 V13 单测（M345-B，stats 避让已有 revenueStructureV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeInpatientRevenueV13,
  computeOutpatientRevenueV13,
  type RevenueStructureRecordV13,
} from "../../src/bff/aggregators/revenueStructureStatsV13Aggregator";
import { revenueStructureStatsV13Routes } from "../../src/bff/routes/revenueStructureStatsV13";

const records: RevenueStructureRecordV13[] = [
  { outpatientRevenue: 300, inpatientRevenue: 200, drugRevenue: 200, consumableRevenue: 60 },
  { outpatientRevenue: 200, inpatientRevenue: 300, drugRevenue: 100, consumableRevenue: 40 },
];

describe("computeOutpatientRevenueV13", () => {
  // 算式：300+200 = 500
  it("门诊收入 = 500 万元", () => {
    expect(computeOutpatientRevenueV13(records)).toBe(500);
  });
});

describe("computeInpatientRevenueV13", () => {
  // 算式：200+300 = 500
  it("住院收入 = 500 万元", () => {
    expect(computeInpatientRevenueV13(records)).toBe(500);
  });
});

describe("computeDrugRatioV13", () => {
  // 算式：(200+100)/((300+200)+(200+300)) = 300/1000×100 = 30.00
  it("药品占比 = 30.00%", () => {
    expect(computeDrugRatioV13(records)).toBe(30.00);
  });
});

describe("computeConsumableRatioV13", () => {
  // 算式：(60+40)/((300+200)+(200+300)) = 100/1000×100 = 10.00
  it("耗材占比 = 10.00%", () => {
    expect(computeConsumableRatioV13(records)).toBe(10.00);
  });
});

describe("revenueStructureStatsV13Routes 读路由", () => {
  it("GET /api/v1/revenue-structure-stats 路由存在且 auth:true", () => {
    const route = revenueStructureStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/revenue-structure-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
