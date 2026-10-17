/**
 * 健澜科技 jlmedaios - 财务明细 V13 单测（M381-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugRevenueRatioV13,
  computeMaterialRevenueRatioV13,
  computeMedicalRevenueRatioV13,
  type FinanceDetailRecordV13,
} from "../../src/bff/aggregators/financeDetailV13Aggregator";
import { financeDetailV13Routes } from "../../src/bff/routes/financeDetailV13";

const records: FinanceDetailRecordV13[] = [
  { medicalRevenue: 600, drugRevenue: 300, materialRevenue: 100, totalRevenue: 1000 },
  { medicalRevenue: 600, drugRevenue: 300, materialRevenue: 100, totalRevenue: 1000 },
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

describe("computeDrugRevenueRatioV13", () => {
  // 算式：(300+300)/(1000+1000) = 600/2000×100 = 30.00
  it("药品收入占比 = 30.00%", () => {
    expect(computeDrugRevenueRatioV13(records)).toBe(30.00);
  });
});

describe("computeMaterialRevenueRatioV13", () => {
  // 算式：(100+100)/(1000+1000) = 200/2000×100 = 10.00
  it("卫生材料收入占比 = 10.00%", () => {
    expect(computeMaterialRevenueRatioV13(records)).toBe(10.00);
  });
});

describe("financeDetailV13Routes 读路由", () => {
  it("GET /api/v1/finance-detail 路由存在且 auth:true", () => {
    const route = financeDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/finance-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
