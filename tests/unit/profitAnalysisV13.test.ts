/**
 * 健澜科技 jlmedaios - 盈亏分析 V13 单测（M407-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAssetLiabilityRatioV13,
  computeReturnOnNetAssetsRateV13,
  computeSurplusDeficitRateV13,
  type ProfitAnalysisRecordV13,
} from "../../src/bff/aggregators/profitAnalysisV13Aggregator";
import { profitAnalysisV13Routes } from "../../src/bff/routes/profitAnalysisV13";

const records: ProfitAnalysisRecordV13[] = [
  { surplus: 50, totalRevenue: 1000, liability: 300, asset: 1000, netProfit: 100, netAsset: 1000 },
  { surplus: 50, totalRevenue: 1000, liability: 300, asset: 1000, netProfit: 100, netAsset: 1000 },
];

describe("computeSurplusDeficitRateV13", () => {
  // 算式：(50+50)/(1000+1000)×100 = 100/2000×100 = 5.00
  it("收支结余率 = 5.00%", () => {
    expect(computeSurplusDeficitRateV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeSurplusDeficitRateV13([])).toBe(0);
  });
});

describe("computeAssetLiabilityRatioV13", () => {
  // 算式：(300+300)/(1000+1000)×100 = 600/2000×100 = 30.00
  it("资产负债率 = 30.00%", () => {
    expect(computeAssetLiabilityRatioV13(records)).toBe(30.00);
  });
});

describe("computeReturnOnNetAssetsRateV13", () => {
  // 算式：(100+100)/(1000+1000)×100 = 200/2000×100 = 10.00
  it("净资产收益率 = 10.00%", () => {
    expect(computeReturnOnNetAssetsRateV13(records)).toBe(10.00);
  });
});

describe("profitAnalysisV13Routes 读路由", () => {
  it("GET /api/v1/profit-analysis 路由存在且 auth:true", () => {
    const route = profitAnalysisV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/profit-analysis",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
