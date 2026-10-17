/**
 * 健澜科技 jlmedaios - 六维指标明细下钻 V13 单测（M306-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  benchmarkVsIndustryV13,
  compareDeptDimensionV13,
  drillDownDimensionV13,
  type DeptScoreV13,
  type FlywheelMetricsV13,
} from "../../src/bff/aggregators/flywheelDrilldownV13Aggregator";
import { flywheelDrilldownV13Routes } from "../../src/bff/routes/flywheelDrilldownV13";

const metrics: FlywheelMetricsV13 = {
  qualityScore: 70,
  adoptionRate: 80,
  feedbackLoopRate: 60,
  pushCtr: 50,
  crossDeptDiffusionRate: 40,
  assetHealthScore: 59,
};

const deptScores: DeptScoreV13[] = [
  { deptId: "cardio", score: 75 },
  { deptId: "surgery", score: 60 },
  { deptId: "pediatrics", score: 50 },
];

describe("drillDownDimensionV13", () => {
  // 算式：qualityScore=70 → sub1=round(70×0.8)=56, sub2=round(70×0.2)=14
  it("qualityScore 下钻：56 + 14", () => {
    const d = drillDownDimensionV13("qualityScore", metrics);
    expect(d.value).toBe(70);
    expect(d.subMetrics[0].value).toBe(56);
    expect(d.subMetrics[1].value).toBe(14);
  });
});

describe("compareDeptDimensionV13", () => {
  // 算式：cardio=75 > surgery=60 > pediatrics=50
  it("降序：cardio → surgery → pediatrics", () => {
    const ranked = compareDeptDimensionV13(deptScores, "qualityScore");
    expect(ranked[0].deptId).toBe("cardio");
    expect(ranked[1].deptId).toBe("surgery");
    expect(ranked[2].deptId).toBe("pediatrics");
  });
  it("空态 → 0", () => {
    expect(compareDeptDimensionV13([], "qualityScore").length).toBe(0);
  });
});

describe("benchmarkVsIndustryV13", () => {
  // 算式：70 > 60 → above
  it("70 vs 60 → above", () => {
    expect(benchmarkVsIndustryV13(70, 60)).toBe("above");
  });
  // 算式：50 < 60 → below
  it("50 vs 60 → below", () => {
    expect(benchmarkVsIndustryV13(50, 60)).toBe("below");
  });
});

describe("flywheelDrilldownV13Routes 读路由", () => {
  it("GET /api/v1/flywheel-drilldown 路由存在且 auth:true", () => {
    const route = flywheelDrilldownV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/flywheel-drilldown",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
