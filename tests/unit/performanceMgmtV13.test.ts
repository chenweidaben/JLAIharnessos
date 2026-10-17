/**
 * 健澜科技 jlmedaios - 绩效管理 V13 单测（M395-D，M395 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeptPerformanceEvaluationCompletionRateV13,
  computeDRGPerformanceIndicatorAchievementRateV13,
  computePatientSatisfactionIndicatorV13,
  type PerformanceMgmtRecordV13,
} from "../../src/bff/aggregators/performanceMgmtV13Aggregator";
import { performanceMgmtV13Routes } from "../../src/bff/routes/performanceMgmtV13";

const records: PerformanceMgmtRecordV13[] = [
  { completedDeptCount: 95, totalDeptCount: 100, achievedCount: 90, drgTotalCount: 100, satisfactionScore: 92.5 },
  { completedDeptCount: 95, totalDeptCount: 100, achievedCount: 90, drgTotalCount: 100, satisfactionScore: 92.5 },
];

describe("computeDeptPerformanceEvaluationCompletionRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("科室绩效考核完成率 = 95.00%", () => {
    expect(computeDeptPerformanceEvaluationCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDeptPerformanceEvaluationCompletionRateV13([])).toBe(0);
  });
});

describe("computeDRGPerformanceIndicatorAchievementRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("DRG绩效指标达成率 = 90.00%", () => {
    expect(computeDRGPerformanceIndicatorAchievementRateV13(records)).toBe(90.00);
  });
});

describe("computePatientSatisfactionIndicatorV13", () => {
  // 算式：(92.5+92.5)/2 = 92.50
  it("患者满意度指标 = 92.50", () => {
    expect(computePatientSatisfactionIndicatorV13(records)).toBe(92.50);
  });
});

describe("performanceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/performance-mgmt 路由存在且 auth:true", () => {
    const route = performanceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/performance-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
