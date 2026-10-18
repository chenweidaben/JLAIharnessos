/**
 * 健澜科技 jlmedaios - 医疗服务价格管理 V13 单测（M445-B，医保物价与费用管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePriceAdjustmentTimelinessRateV13,
  computePriceComplaintRateV13,
  computePriceExecutionAccuracyRateV13,
  type PriceMgmtRecordV13,
} from "../../src/bff/aggregators/priceMgmtV13Aggregator";
import { priceMgmtV13Routes } from "../../src/bff/routes/priceMgmtV13";

const records: PriceMgmtRecordV13[] = [
  { accurate: 950, totalChecked: 1000, timelyAdjusted: 900, shouldAdjust: 1000, complaint: 5, totalService: 1000 },
  { accurate: 950, totalChecked: 1000, timelyAdjusted: 900, shouldAdjust: 1000, complaint: 5, totalService: 1000 },
];

describe("computePriceExecutionAccuracyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("价格执行准确率 = 95.00%", () => {
    expect(computePriceExecutionAccuracyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePriceExecutionAccuracyRateV13([])).toBe(0);
  });
});

describe("computePriceAdjustmentTimelinessRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("价格调整及时率 = 90.00%", () => {
    expect(computePriceAdjustmentTimelinessRateV13(records)).toBe(90.00);
  });
});

describe("computePriceComplaintRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50（反向，越低越好）
  it("价格投诉率 = 0.50%（反向，越低越好）", () => {
    expect(computePriceComplaintRateV13(records)).toBe(0.50);
  });
});

describe("priceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/price-mgmt 路由存在且 auth:true", () => {
    const route = priceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/price-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
