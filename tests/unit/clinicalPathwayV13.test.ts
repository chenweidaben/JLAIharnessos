/**
 * 健澜科技 jlmedaios - 临床路径执行率 V13 单测（M333-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCompletionRateV13,
  computeEnrollmentRateV13,
  computeVariationRateV13,
  type PathwayRecordV13,
} from "../../src/bff/aggregators/clinicalPathwayV13Aggregator";
import { clinicalPathwayV13Routes } from "../../src/bff/routes/clinicalPathwayV13";

const records: PathwayRecordV13[] = [
  { eligibleCount: 100, enrolledCount: 80, completedCount: 60, variationCount: 10 },
];

describe("computeEnrollmentRateV13", () => {
  // 算式：80/100×100 = 80
  it("入径率 = 80%", () => {
    expect(computeEnrollmentRateV13(records)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeEnrollmentRateV13([])).toBe(0);
  });
});

describe("computeCompletionRateV13", () => {
  // 算式：60/80×100 = 75
  it("完成率 = 75%", () => {
    expect(computeCompletionRateV13(records)).toBe(75);
  });
});

describe("computeVariationRateV13", () => {
  // 算式：10/80×100 = 12.5
  it("变异率 = 12.5%", () => {
    expect(computeVariationRateV13(records)).toBe(12.5);
  });
});

describe("clinicalPathwayV13Routes 读路由", () => {
  it("GET /api/v1/clinical-pathway-overview 路由存在且 auth:true", () => {
    const route = clinicalPathwayV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-pathway-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
