/**
 * 健澜科技 jlmedaios - 财务管理 V13 单测（M364-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAssetLiabilityRatioV13,
  computeCostControlRateV13,
  computeRevenueGrowthRateV13,
  type FinanceMgmtRecordV13,
} from "../../src/bff/aggregators/financeMgmtV13Aggregator";
import { financeMgmtV13Routes } from "../../src/bff/routes/financeMgmtV13";

const records: FinanceMgmtRecordV13[] = [
  { currentRevenue: 110, previousRevenue: 100, budgetCost: 1000, actualCost: 950, totalLiabilities: 3000, totalAssets: 10000 },
  { currentRevenue: 110, previousRevenue: 100, budgetCost: 1000, actualCost: 950, totalLiabilities: 3000, totalAssets: 10000 },
];

describe("computeRevenueGrowthRateV13", () => {
  // 算式：(110+110 - 100-100)/(100+100) = 20/200×100 = 10.00
  it("收入增长率 = 10.00%", () => {
    expect(computeRevenueGrowthRateV13(records)).toBe(10.00);
  });
  it("空态 → 0", () => {
    expect(computeRevenueGrowthRateV13([])).toBe(0);
  });
});

describe("computeCostControlRateV13", () => {
  // 算式：((1000-950)+(1000-950))/(1000+1000) = 100/2000×100 = 5.00
  it("成本控制率 = 5.00%", () => {
    expect(computeCostControlRateV13(records)).toBe(5.00);
  });
});

describe("computeAssetLiabilityRatioV13", () => {
  // 算式：(3000+3000)/(10000+10000) = 6000/20000×100 = 30.00
  it("资产负债率 = 30.00%", () => {
    expect(computeAssetLiabilityRatioV13(records)).toBe(30.00);
  });
});

describe("financeMgmtV13Routes 读路由", () => {
  it("GET /api/v1/finance-mgmt 路由存在且 auth:true", () => {
    const route = financeMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/finance-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
