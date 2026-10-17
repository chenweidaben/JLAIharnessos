/**
 * 健澜科技 jlmedaios - 绩效考核 V13 单测（M384-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAppealCountV13,
  computeExcellentRatioV13,
  computePerformanceEvalCompletionRateV13,
  type PerformanceEvalRecordV13,
} from "../../src/bff/aggregators/performanceEvalV13Aggregator";
import { performanceEvalV13Routes } from "../../src/bff/routes/performanceEvalV13";

const records: PerformanceEvalRecordV13[] = [
  { completedCount: 950, totalCount: 1000, excellentCount: 200, totalEvalCount: 1000, appealCount: 10 },
  { completedCount: 950, totalCount: 1000, excellentCount: 200, totalEvalCount: 1000, appealCount: 10 },
];

describe("computePerformanceEvalCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("绩效考核完成率 = 95.00%", () => {
    expect(computePerformanceEvalCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePerformanceEvalCompletionRateV13([])).toBe(0);
  });
});

describe("computeExcellentRatioV13", () => {
  // 算式：(200+200)/(1000+1000) = 400/2000×100 = 20.00
  it("优秀比例 = 20.00%", () => {
    expect(computeExcellentRatioV13(records)).toBe(20.00);
  });
});

describe("computeAppealCountV13", () => {
  // 算式：10+10 = 20
  it("考核申诉数 = 20 件", () => {
    expect(computeAppealCountV13(records)).toBe(20);
  });
});

describe("performanceEvalV13Routes 读路由", () => {
  it("GET /api/v1/performance-eval 路由存在且 auth:true", () => {
    const route = performanceEvalV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/performance-eval",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
