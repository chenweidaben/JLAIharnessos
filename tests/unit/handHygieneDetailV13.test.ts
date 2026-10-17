/**
 * 健澜科技 jlmedaios - 手卫生明细 V13 单测（M393-A，避让旧版 handHygieneV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHandHygieneComplianceRateV13,
  computeHandHygieneConsumableUsageV13,
  computeHandHygieneCorrectRateV13,
  type HandHygieneDetailRecordV13,
} from "../../src/bff/aggregators/handHygieneDetailV13Aggregator";
import { handHygieneDetailV13Routes } from "../../src/bff/routes/handHygieneDetailV13";

const records: HandHygieneDetailRecordV13[] = [
  { compliantCount: 950, shouldCount: 1000, correctCount: 900, executionCount: 1000, usageMlCount: 50000 },
  { compliantCount: 950, shouldCount: 1000, correctCount: 900, executionCount: 1000, usageMlCount: 50000 },
];

describe("computeHandHygieneComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("手卫生依从率 = 95.00%", () => {
    expect(computeHandHygieneComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeHandHygieneComplianceRateV13([])).toBe(0);
  });
});

describe("computeHandHygieneCorrectRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("手卫生正确率 = 90.00%", () => {
    expect(computeHandHygieneCorrectRateV13(records)).toBe(90.00);
  });
});

describe("computeHandHygieneConsumableUsageV13", () => {
  // 算式：50000+50000 = 100000 ml
  it("手卫生用品消耗量 = 100000 ml", () => {
    expect(computeHandHygieneConsumableUsageV13(records)).toBe(100000);
  });
});

describe("handHygieneDetailV13Routes 读路由", () => {
  it("GET /api/v1/hand-hygiene-detail 路由存在且 auth:true", () => {
    const route = handHygieneDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hand-hygiene-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
