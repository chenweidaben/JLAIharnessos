/**
 * 健澜科技 jlmedaios - 绩效改进 V13 单测（M410-D，M410 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePerformanceAppealHandleRateV13,
  computePerformanceImprovementPlanCompletionRateV13,
  computePerformanceTrainingCoverageRateV13,
  type PerformanceImprovementRecordV13,
} from "../../src/bff/aggregators/performanceImprovementV13Aggregator";
import { performanceImprovementV13Routes } from "../../src/bff/routes/performanceImprovementV13";

const records: PerformanceImprovementRecordV13[] = [
  { handled: 95, appealTotal: 100, completed: 90, planTotal: 100, trained: 980, shouldTrain: 1000 },
  { handled: 95, appealTotal: 100, completed: 90, planTotal: 100, trained: 980, shouldTrain: 1000 },
];

describe("computePerformanceAppealHandleRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("绩效申诉处理率 = 95.00%", () => {
    expect(computePerformanceAppealHandleRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePerformanceAppealHandleRateV13([])).toBe(0);
  });
});

describe("computePerformanceImprovementPlanCompletionRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("绩效改进计划完成率 = 90.00%", () => {
    expect(computePerformanceImprovementPlanCompletionRateV13(records)).toBe(90.00);
  });
});

describe("computePerformanceTrainingCoverageRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("绩效培训覆盖率 = 98.00%", () => {
    expect(computePerformanceTrainingCoverageRateV13(records)).toBe(98.00);
  });
});

describe("performanceImprovementV13Routes 读路由", () => {
  it("GET /api/v1/performance-improvement 路由存在且 auth:true", () => {
    const route = performanceImprovementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/performance-improvement",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
