/**
 * 健澜科技 jlmedaios - 收入结构 V13 单测（M329-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRevenueShareV13,
  computeTotalRevenueV13,
  type RevenueCategoryV13,
} from "../../src/bff/aggregators/revenueStructureV13Aggregator";
import { revenueStructureV13Routes } from "../../src/bff/routes/revenueStructureV13";

const revenue: RevenueCategoryV13[] = [
  { category: "医疗", amount: 600 },
  { category: "药品", amount: 300 },
  { category: "检查", amount: 400 },
  { category: "化验", amount: 200 },
];

describe("computeTotalRevenueV13", () => {
  // 算式：600+300+400+200 = 1500
  it("总收入 = 1500", () => {
    expect(computeTotalRevenueV13(revenue)).toBe(1500);
  });
  it("空态 → 0", () => {
    expect(computeTotalRevenueV13([])).toBe(0);
  });
});

describe("computeRevenueShareV13", () => {
  // 算式：医疗600/1500=40% / 药品300/1500=20% / 检查400/1500≈27% / 化验200/1500≈13%
  it("医疗占比 = 40%", () => {
    const result = computeRevenueShareV13(revenue);
    expect(result.length).toBe(4);
    expect(result[0].category).toBe("医疗");
    expect(result[0].share).toBe(40);
  });
  it("空态占比 → []", () => {
    expect(computeRevenueShareV13([]).length).toBe(0);
  });
});

describe("revenueStructureV13Routes 读路由", () => {
  it("GET /api/v1/revenue-structure 路由存在且 auth:true", () => {
    const route = revenueStructureV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/revenue-structure",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
