/**
 * 健澜科技 jlmedaios - 成本控制明细 V13 单测（M396-C，避让旧版 costControlV13/medicalCostControlV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeptCostAccountingRateV13,
  computeHundredYuanMedicalRevenueConsumableV13,
  computePerCapitaOutpatientCostV13,
  type CostControlDetailRecordV13,
} from "../../src/bff/aggregators/costControlDetailV13Aggregator";
import { costControlDetailV13Routes } from "../../src/bff/routes/costControlDetailV13";

const records: CostControlDetailRecordV13[] = [
  { accountedCount: 95, totalCount: 100, consumableCost: 200, medicalRevenue: 1000, outpatientRevenue: 50000, outpatientCount: 1000 },
  { accountedCount: 95, totalCount: 100, consumableCost: 200, medicalRevenue: 1000, outpatientRevenue: 50000, outpatientCount: 1000 },
];

describe("computeDeptCostAccountingRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("科室成本核算率 = 95.00%", () => {
    expect(computeDeptCostAccountingRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDeptCostAccountingRateV13([])).toBe(0);
  });
});

describe("computeHundredYuanMedicalRevenueConsumableV13", () => {
  // 算式：(200+200)/(1000+1000) = 400/2000×100 = 20.00
  it("百元医疗收入消耗卫生材料 = 20.00 元", () => {
    expect(computeHundredYuanMedicalRevenueConsumableV13(records)).toBe(20.00);
  });
});

describe("computePerCapitaOutpatientCostV13", () => {
  // 算式：(50000+50000)/(1000+1000) = 100000/2000 = 50.00
  it("人均门诊费用 = 50.00 元", () => {
    expect(computePerCapitaOutpatientCostV13(records)).toBe(50.00);
  });
});

describe("costControlDetailV13Routes 读路由", () => {
  it("GET /api/v1/cost-control-detail 路由存在且 auth:true", () => {
    const route = costControlDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cost-control-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
