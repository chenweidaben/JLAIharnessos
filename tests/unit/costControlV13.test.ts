/**
 * 健澜科技 jlmedaios - 成本控制 V13 单测（M345-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugRatioYoyV13,
  computeInpatientAvgCostV13,
  computeOutpatientAvgCostV13,
  type CostControlRecordV13,
} from "../../src/bff/aggregators/costControlV13Aggregator";
import { costControlV13Routes } from "../../src/bff/routes/costControlV13";

const records: CostControlRecordV13[] = [
  { outpatientCost: 300, inpatientCost: 8000, drugRatioCurrent: 30.5, drugRatioPrevious: 31.0 },
  { outpatientCost: 500, inpatientCost: 10000, drugRatioCurrent: 30.5, drugRatioPrevious: 31.0 },
  { outpatientCost: 400, inpatientCost: 9000, drugRatioCurrent: 30.5, drugRatioPrevious: 31.0 },
];

describe("computeOutpatientAvgCostV13", () => {
  // 算式：(300+500+400)/3 = 1200/3 = 400
  it("次均门诊费用 = 400 元", () => {
    expect(computeOutpatientAvgCostV13(records)).toBe(400);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientAvgCostV13([])).toBe(0);
  });
});

describe("computeInpatientAvgCostV13", () => {
  // 算式：(8000+10000+9000)/3 = 27000/3 = 9000
  it("次均住院费用 = 9000 元", () => {
    expect(computeInpatientAvgCostV13(records)).toBe(9000);
  });
});

describe("computeDrugRatioYoyV13", () => {
  // 算式：((30.5-31.0)+(30.5-31.0)+(30.5-31.0))/3 = (-0.5-0.5-0.5)/3 = -0.5
  it("药占比同比 = -0.5 个百分点", () => {
    expect(computeDrugRatioYoyV13(records)).toBe(-0.5);
  });
});

describe("costControlV13Routes 读路由", () => {
  it("GET /api/v1/cost-control 路由存在且 auth:true", () => {
    const route = costControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cost-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
