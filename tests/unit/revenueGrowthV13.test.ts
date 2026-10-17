/**
 * 健澜科技 jlmedaios - 收入增长 V13 单测（M407-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientRevenueGrowthRateV13,
  computeMedicalServiceRevenueRatioV13,
  computeOutpatientRevenueGrowthRateV13,
  type RevenueGrowthRecordV13,
} from "../../src/bff/aggregators/revenueGrowthV13Aggregator";
import { revenueGrowthV13Routes } from "../../src/bff/routes/revenueGrowthV13";

const records: RevenueGrowthRecordV13[] = [
  { outpatientCurrent: 1100, outpatientPrevious: 1000, inpatientCurrent: 1200, inpatientPrevious: 1000, serviceRevenue: 400, totalRevenue: 1000 },
  { outpatientCurrent: 1100, outpatientPrevious: 1000, inpatientCurrent: 1200, inpatientPrevious: 1000, serviceRevenue: 400, totalRevenue: 1000 },
];

describe("computeOutpatientRevenueGrowthRateV13", () => {
  // 算式：(1100+1100 - 1000-1000)/(1000+1000)×100 = (2200-2000)/2000×100 = 200/2000×100 = 10.00
  it("门诊收入增长率 = 10.00%", () => {
    expect(computeOutpatientRevenueGrowthRateV13(records)).toBe(10.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientRevenueGrowthRateV13([])).toBe(0);
  });
});

describe("computeInpatientRevenueGrowthRateV13", () => {
  // 算式：(1200+1200 - 1000-1000)/(1000+1000)×100 = (2400-2000)/2000×100 = 400/2000×100 = 20.00
  it("住院收入增长率 = 20.00%", () => {
    expect(computeInpatientRevenueGrowthRateV13(records)).toBe(20.00);
  });
});

describe("computeMedicalServiceRevenueRatioV13", () => {
  // 算式：(400+400)/(1000+1000)×100 = 800/2000×100 = 40.00
  it("医疗服务收入占比 = 40.00%", () => {
    expect(computeMedicalServiceRevenueRatioV13(records)).toBe(40.00);
  });
});

describe("revenueGrowthV13Routes 读路由", () => {
  it("GET /api/v1/revenue-growth 路由存在且 auth:true", () => {
    const route = revenueGrowthV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/revenue-growth",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
